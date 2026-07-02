import { prisma } from "@tbrpg/db";
import { appendCampaignEvent } from "./event-log";
import { assertCampaignAccess, assertHost, AccessDeniedError } from "./permissions";

export async function listCampaignMembers(campaignId: string, userId: string) {
  const { memberRole } = await assertCampaignAccess(campaignId, userId, "OBSERVER");

  const members = await prisma.campaignMember.findMany({
    where: { campaignId },
    orderBy: { joinedAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const characters = await prisma.character.findMany({
    where: { campaignId, isPlayerCharacter: true, userId: { not: null } },
    select: { userId: true, name: true },
  });
  const characterNames = new Map(characters.map((c) => [c.userId!, c.name]));

  return {
    viewerRole: memberRole,
    members: members.map((m) => ({
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      name: m.user.name,
      email: m.user.email,
      characterName: characterNames.get(m.userId) ?? null,
    })),
  };
}

/** Host-only. Removes a player's membership, characters, markers, and scene participation. */
export async function removeCampaignMember(
  campaignId: string,
  hostUserId: string,
  targetUserId: string,
) {
  await assertHost(campaignId, hostUserId);

  const target = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId, userId: targetUserId } },
  });
  if (!target) return;
  if (target.role === "HOST") {
    throw new AccessDeniedError("The host cannot be removed");
  }

  await prisma.$transaction(async (tx) => {
    const characters = await tx.character.findMany({
      where: { campaignId, userId: targetUserId },
      select: { id: true },
    });
    const characterIds = characters.map((c) => c.id);

    if (characterIds.length > 0) {
      await tx.mapMarker.deleteMany({
        where: { campaignId, entityId: { in: characterIds } },
      });
      await tx.sceneParticipant.deleteMany({
        where: { characterId: { in: characterIds } },
      });
      await tx.character.deleteMany({ where: { id: { in: characterIds } } });
    }

    await tx.sceneParticipant.deleteMany({
      where: { userId: targetUserId, scene: { campaignId } },
    });

    await tx.campaignMember.delete({
      where: { campaignId_userId: { campaignId, userId: targetUserId } },
    });

    await appendCampaignEvent(tx, {
      campaignId,
      eventType: "member.removed",
      actorUserId: hostUserId,
      payload: { removedUserId: targetUserId },
    });
  });
}
