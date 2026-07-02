import { prisma } from "@tbrpg/db";
import type { CreateCampaignInput, GeneratedCampaign } from "@tbrpg/shared";
import { generatedCampaignSchema } from "@tbrpg/shared";
import type { AiImageRouter, AiRouter } from "@tbrpg/ai";
import { buildCampaignPrompt } from "@tbrpg/ai";
import type { StorageAdapter } from "@tbrpg/storage";
import { assertCampaignAccess, assertHost, NotFoundError } from "./permissions";
import { appendCampaignEvent } from "./event-log";
import { generateCampaignArt } from "./campaign-art";

function toPrismaGenerationMode(mode: CreateCampaignInput["generationMode"]) {
  return mode.toUpperCase() as "RANDOM" | "ROUGH_IDEA" | "CUSTOM";
}

async function seedGeneratedWorld(
  campaignId: string,
  userId: string,
  generated: GeneratedCampaign,
) {
  const startLocation = await prisma.location.create({
    data: {
      campaignId,
      name: generated.startingLocation.name,
      description: generated.startingLocation.description,
      mapLevel: "settlement",
      coordinates: {
        x: 0.48,
        y: 0.52,
      },
      discoveryState: { discovered: true, discoveredBy: "party" },
      metadata: { isStartingLocation: true },
    },
  });

  const character = await prisma.character.create({
    data: {
      campaignId,
      userId,
      isPlayerCharacter: true,
      name: "Adventurer",
      profile: { background: "A newcomer to the harbor." },
      locationId: startLocation.id,
    },
  });

  for (const region of generated.regions) {
    await prisma.location.create({
      data: {
        campaignId,
        name: region.name,
        description: region.description,
        mapLevel: "region",
        discoveryState: { discovered: false },
      },
    });
  }

  for (const faction of generated.factions) {
    await prisma.faction.create({
      data: {
        campaignId,
        name: faction.name,
        description: faction.description,
      },
    });
  }

  const npcRecords = [];
  for (const npc of generated.npcs) {
    const record = await prisma.npc.create({
      data: {
        campaignId,
        name: npc.name,
        locationId: startLocation.id,
        personality: {
          role: npc.role,
          summary: npc.personality,
          goals: npc.goals,
        },
      },
    });
    npcRecords.push(record);
  }

  for (const thread of generated.storyThreads) {
    await prisma.quest.create({
      data: {
        campaignId,
        title: thread.title,
        description: thread.description,
        threadType: "main",
        status: "active",
      },
    });
  }

  await prisma.codexEntry.createMany({
    data: [
      {
        campaignId,
        category: "lore",
        slug: "world-history",
        title: "World History",
        content: { body: generated.worldHistory },
      },
      {
        campaignId,
        category: "lore",
        slug: "current-situation",
        title: "Current Situation",
        content: { body: generated.currentSituation },
      },
      ...generated.rumours.map((rumour, i) => ({
        campaignId,
        category: "rumours",
        slug: `rumour-${i + 1}`,
        title: `Rumour ${i + 1}`,
        content: { body: rumour },
      })),
    ],
  });

  await prisma.mapMarker.createMany({
    data: [
      {
        campaignId,
        locationId: startLocation.id,
        markerType: "location",
        entityId: startLocation.id,
        label: startLocation.name,
        position: {
          x: 0.48,
          y: 0.52,
        },
      },
      {
        campaignId,
        markerType: "player",
        entityId: character.id,
        label: character.name,
        position: {
          x: 0.5,
          y: 0.54,
        },
      },
      ...npcRecords.map((npc, i) => ({
        campaignId,
        markerType: "npc",
        entityId: npc.id,
        label: npc.name,
        position: {
          x: 0.44 - 0.03 * i,
          y: 0.5 + 0.02 * i,
        },
      })),
    ],
  });

  const scene = await prisma.scene.create({
    data: {
      campaignId,
      scope: "PARTY",
      locationId: startLocation.id,
      title: `Arrival at ${startLocation.name}`,
      participants: {
        create: [{ userId, characterId: character.id, role: "player" }],
      },
    },
  });

  return { startLocation, character, scene };
}

export async function createCampaign(
  userId: string,
  input: CreateCampaignInput,
  ai: AiRouter,
  options?: {
    imageRouter?: AiImageRouter;
    storage?: StorageAdapter;
  },
) {
  const premise =
    input.generationMode === "rough_idea"
      ? input.roughIdea
      : input.generationMode === "custom"
        ? input.premise
        : undefined;

  const campaign = await prisma.campaign.create({
    data: {
      hostUserId: userId,
      title:
        input.generationMode === "custom"
          ? input.title
          : input.title ?? "Untitled Campaign",
      premise,
      status: "DRAFT",
      mode: input.mode,
      generationMode: toPrismaGenerationMode(input.generationMode),
      tone: "tone" in input ? input.tone : undefined,
      genre: "genre" in input ? input.genre : undefined,
      members: {
        create: { userId, role: "HOST" },
      },
    },
  });

  const promptText =
    input.generationMode === "rough_idea"
      ? input.roughIdea
      : input.generationMode === "custom"
        ? `${input.premise}\nSetting: ${input.setting}`
        : "Generate a surprising original campaign.";

  const response = await ai.generateText<GeneratedCampaign>({
    taskType: "campaign_generation",
    messages: [
      {
        role: "system",
        content: "Return JSON only matching the campaign generation schema.",
      },
      {
        role: "user",
        content: buildCampaignPrompt({
          generationMode: input.generationMode,
          prompt: promptText,
        }),
      },
    ],
    structuredSchema: generatedCampaignSchema,
    temperature: 0.9,
  });

  const generated = generatedCampaignSchema.parse(response.structured);

  const seeded = await prisma.$transaction(async (tx) => {
    const updated = await tx.campaign.update({
      where: { id: campaign.id },
      data: {
        title: generated.title,
        premise: generated.premise,
        status: "ACTIVE",
        worldState: {
          economyNotes: null,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    await appendCampaignEvent(tx, {
      campaignId: campaign.id,
      eventType: "campaign.generated",
      actorUserId: userId,
      payload: { generationMode: input.generationMode, provider: response.provider },
    });

    return updated;
  });

  const world = await seedGeneratedWorld(campaign.id, userId, generated);

  let art = { mapConfig: null as import("@tbrpg/shared").CampaignMapConfig | null, portraitsGenerated: 0 };
  if (options?.imageRouter && options?.storage) {
    art = await generateCampaignArt(
      {
        campaignId: campaign.id,
        generated,
        createInput: input,
        characterId: world.character.id,
        startLocationId: world.startLocation.id,
        npcs: (
          await prisma.npc.findMany({
            where: { campaignId: campaign.id },
            select: { id: true, name: true, personality: true },
          })
        ).map((npc) => ({
          id: npc.id,
          name: npc.name,
          role: (npc.personality as { role?: string })?.role,
          personality: (npc.personality as { summary?: string })?.summary,
        })),
      },
      options.imageRouter,
      options.storage,
    );
  }

  return { campaign: seeded, generated, ...world, art };
}

export async function listCampaigns(userId: string) {
  return prisma.campaign.findMany({
    where: {
      members: { some: { userId } },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
}

export async function getCampaign(campaignId: string, userId: string) {
  await assertCampaignAccess(campaignId, userId, "OBSERVER");
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      locations: true,
      characters: true,
      npcs: true,
      mapMarkers: true,
      codexEntries: { orderBy: { updatedAt: "desc" }, take: 20 },
      scenes: { where: { status: "ACTIVE" }, take: 5 },
    },
  });
  if (!campaign) throw new NotFoundError("Campaign", campaignId);
  return campaign;
}

export async function deleteCampaign(campaignId: string, userId: string) {
  await assertHost(campaignId, userId);
  await prisma.campaign.delete({ where: { id: campaignId } });
}

export async function exportCampaign(campaignId: string, userId: string) {
  await assertCampaignAccess(campaignId, userId, "OBSERVER");
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      members: true,
      characters: true,
      npcs: true,
      locations: true,
      mapMarkers: true,
      items: true,
      quests: true,
      factions: true,
      codexEntries: true,
      events: { orderBy: { sequence: "asc" } },
      scenes: { include: { participants: true } },
      playerKnowledge: true,
    },
  });
  if (!campaign) throw new NotFoundError("Campaign", campaignId);
  return { version: 1, exportedAt: new Date().toISOString(), campaign };
}
