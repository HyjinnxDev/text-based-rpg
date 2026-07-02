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

  const [codexEntries, items, quests, members, characters, turns] = await Promise.all([
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
      select: { userId: true, name: true },
    }),
    sceneId
      ? getTurnStateWithRole(campaignId, userId, sceneId, memberRole)
      : Promise.resolve(null),
  ]);

  const characterNames = new Map(characters.map((c) => [c.userId!, c.name]));

  return {
    viewerRole: memberRole,
    codexEntries,
    items,
    quests,
    members: members.map((m) => ({
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      name: m.user.name,
      email: m.user.email,
      characterName: characterNames.get(m.userId) ?? null,
    })),
    turns,
  };
}
