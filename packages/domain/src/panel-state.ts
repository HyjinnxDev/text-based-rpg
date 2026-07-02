import { prisma } from "@tbrpg/db";
import { assertCampaignAccess } from "./permissions";
import { getTurnStateWithRole } from "./turns";

/**
 * Single round trip for everything the play-page side panels need
 * (codex, journal, members, turn state) — one access check, parallel queries.
 */
export async function getCampaignPanelState(
  campaignId: string,
  userId: string,
  sceneId?: string,
) {
  const { memberRole } = await assertCampaignAccess(campaignId, userId, "OBSERVER");

  const [codexEntries, items, quests, members, characters, npcs, turns, latestEvent] = await Promise.all([
    prisma.codexEntry.findMany({
      where: { campaignId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.item.findMany({
      where: { campaignId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.quest.findMany({
      where: { campaignId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.campaignMember.findMany({
      where: { campaignId },
      orderBy: { joinedAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.character.findMany({
      where: { campaignId, isPlayerCharacter: true, userId: { not: null } },
      select: { userId: true, name: true, portraitUrl: true },
    }),
    prisma.npc.findMany({
      where: { campaignId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        portraitUrl: true,
        personality: true,
        memory: true,
        status: true,
      },
    }),
    sceneId
      ? getTurnStateWithRole(campaignId, userId, sceneId, memberRole)
      : Promise.resolve(null),
    prisma.campaignEvent.findFirst({
      where: { campaignId, eventType: "state.applied" },
      orderBy: { sequence: "desc" },
      select: { stateDelta: true },
    }),
  ]);

  const charactersByUser = new Map(characters.map((c) => [c.userId!, c]));

  // Where the story left off: last resolved narration, or the generated
  // opening situation for a campaign nobody has acted in yet.
  const latestNarration =
    (latestEvent?.stateDelta as { narration?: string } | null)?.narration ??
    (codexEntries.find((e) => e.slug === "current-situation")?.content as
      | { body?: string }
      | undefined)?.body ??
    null;

  return {
    viewerRole: memberRole,
    latestNarration,
    codexEntries,
    items,
    quests,
    members: members.map((m) => ({
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      name: m.user.name,
      email: m.user.email,
      characterName: charactersByUser.get(m.userId)?.name ?? null,
      portraitUrl: charactersByUser.get(m.userId)?.portraitUrl ?? null,
    })),
    npcs: npcs.map((npc) => {
      const personality = npc.personality as {
        role?: string;
        summary?: string;
        mood?: string;
      } | null;
      const memory = npc.memory as { events?: string[] } | null;
      return {
        id: npc.id,
        name: npc.name,
        portraitUrl: npc.portraitUrl,
        role: personality?.role ?? null,
        summary: personality?.summary ?? null,
        mood: personality?.mood ?? null,
        alive: (npc.status as { alive?: boolean } | null)?.alive ?? true,
        recentMemories: (memory?.events ?? []).slice(-3).reverse(),
      };
    }),
    turns,
  };
}
