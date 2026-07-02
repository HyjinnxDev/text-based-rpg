import { prisma } from "@tbrpg/db";
import type { AiImageRouter } from "@tbrpg/ai";
import { buildImagePrompt } from "@tbrpg/ai";
import type { CampaignMapConfig, CreateCampaignInput, GeneratedCampaign } from "@tbrpg/shared";
import type { StorageAdapter } from "@tbrpg/storage";
import { MAX_MAP_ZOOM, sliceMapIntoTiles, toWebp } from "./tile-slicer";

const MAX_NPC_PORTRAITS = 3;

export interface CampaignArtInput {
  campaignId: string;
  generated: GeneratedCampaign;
  createInput: CreateCampaignInput;
  characterId: string;
  startLocationId: string;
  npcs: Array<{ id: string; name: string; role?: string; personality?: string }>;
}

export interface CampaignArtResult {
  mapConfig: CampaignMapConfig | null;
  portraitsGenerated: number;
}

function mapStorageKey(campaignId: string, ...parts: string[]) {
  return ["campaigns", campaignId, ...parts].join("/");
}

export async function generateCampaignArt(
  input: CampaignArtInput,
  imageRouter: AiImageRouter,
  storage: StorageAdapter,
): Promise<CampaignArtResult> {
  if (!imageRouter.enabled) {
    return { mapConfig: null, portraitsGenerated: 0 };
  }

  const tone = "tone" in input.createInput ? input.createInput.tone : undefined;
  const genre = "genre" in input.createInput ? input.createInput.genre : undefined;

  let mapConfig: CampaignMapConfig | null = null;
  let portraitsGenerated = 0;

  const mapJob = (async () => {
    const mapResult = await imageRouter.generateImage({
      taskType: "campaign_map",
      prompt: buildImagePrompt("campaign_map", {
        title: input.generated.title,
        premise: input.generated.premise,
        tone,
        genre,
        regions: input.generated.regions,
      }),
      aspectRatio: "1:1",
    });
    if (!mapResult) return;

    const { normalized, tiles, width, height } = await sliceMapIntoTiles(
      Buffer.from(mapResult.data),
    );

    const mapKey = mapStorageKey(input.campaignId, "map.webp");
    await Promise.all([
      storage.put(mapKey, normalized, "image/webp"),
      ...tiles.map((tile) =>
        storage.put(
          mapStorageKey(
            input.campaignId,
            "tiles",
            String(tile.z),
            String(tile.x),
            `${tile.y}.webp`,
          ),
          tile.data,
          "image/webp",
        ),
      ),
    ]);

    const imageUrl = storage.getUrl(mapKey);
    const tileUrlTemplate = `/api/campaigns/${input.campaignId}/maps/{z}/{x}/{y}.webp`;

    mapConfig = {
      width,
      height,
      minZoom: 0,
      maxZoom: MAX_MAP_ZOOM,
      imageUrl,
      tileUrlTemplate,
    };

    const current = await prisma.campaign.findUnique({
      where: { id: input.campaignId },
      select: { settings: true },
    });
    await prisma.campaign.update({
      where: { id: input.campaignId },
      data: {
        settings: {
          ...((current?.settings as object) ?? {}),
          map: mapConfig,
        },
      },
    });
  })();

  const landscapeJob = (async () => {
    const landscapeResult = await imageRouter.generateImage({
      taskType: "location_landscape",
      prompt: buildImagePrompt("location_landscape", {
        locationName: input.generated.startingLocation.name,
        description: input.generated.startingLocation.description,
        tone,
      }),
      aspectRatio: "16:9",
    });
    if (!landscapeResult) return;

    const webp = await toWebp(Buffer.from(landscapeResult.data));
    const key = mapStorageKey(input.campaignId, "landscapes", `${input.startLocationId}.webp`);
    const url = await storage.put(key, webp, "image/webp");
    await prisma.location.update({
      where: { id: input.startLocationId },
      data: {
        metadata: {
          landscapeUrl: url,
        },
      },
    });
  })();

  const portraitJobs: Array<Promise<void>> = [];

  portraitJobs.push(
    (async () => {
      const result = await imageRouter.generateImage({
        taskType: "character_portrait",
        prompt: buildImagePrompt("character_portrait", {
          name: input.createInput.characterName?.trim() || "Adventurer",
          description: "A newcomer ready for adventure",
          tone,
        }),
        aspectRatio: "3:4",
      });
      if (!result) return;
      const webp = await toWebp(Buffer.from(result.data));
      const key = mapStorageKey(input.campaignId, "portraits", `character-${input.characterId}.webp`);
      const url = await storage.put(key, webp, "image/webp");
      await prisma.character.update({
        where: { id: input.characterId },
        data: { portraitUrl: url },
      });
      portraitsGenerated += 1;
    })(),
  );

  for (const npc of input.npcs.slice(0, MAX_NPC_PORTRAITS)) {
    portraitJobs.push(
      (async () => {
        const result = await imageRouter.generateImage({
          taskType: "npc_portrait",
          prompt: buildImagePrompt("npc_portrait", {
            name: npc.name,
            role: npc.role,
            description: npc.personality,
            tone,
          }),
          aspectRatio: "3:4",
        });
        if (!result) return;
        const webp = await toWebp(Buffer.from(result.data));
        const key = mapStorageKey(input.campaignId, "portraits", `npc-${npc.id}.webp`);
        const url = await storage.put(key, webp, "image/webp");
        await prisma.npc.update({
          where: { id: npc.id },
          data: { portraitUrl: url },
        });
        portraitsGenerated += 1;
      })(),
    );
  }

  const results = await Promise.allSettled([mapJob, landscapeJob, ...portraitJobs]);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Campaign art job failed", result.reason);
    }
  }

  return { mapConfig, portraitsGenerated };
}
