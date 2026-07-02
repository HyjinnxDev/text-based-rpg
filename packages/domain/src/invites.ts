import { randomBytes } from "node:crypto";
import { prisma } from "@tbrpg/db";
import { appendCampaignEvent } from "./event-log";
import { assertHost, NotFoundError, AccessDeniedError } from "./permissions";

function generateInviteCode() {
  return randomBytes(8).toString("base64url");
}

/** Host-only: returns the campaign's invite code, creating one on first use. */
export async function getOrCreateInviteCode(campaignId: string, userId: string) {
  const { campaign } = await assertHost(campaignId, userId);
  if (campaign.inviteCode) return campaign.inviteCode;

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: { inviteCode: generateInviteCode() },
  });
  return updated.inviteCode!;
}

/** Public preview of a campaign for the join page. */
export async function getInvitePreview(code: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { inviteCode: code },
    select: {
      id: true,
      title: true,
      premise: true,
      mode: true,
      maxPlayers: true,
      _count: { select: { members: true } },
    },
  });
  if (!campaign) throw new NotFoundError("Invite", code);
  return {
    campaignId: campaign.id,
    title: campaign.title,
    premise: campaign.premise,
    mode: campaign.mode,
    maxPlayers: campaign.maxPlayers,
    memberCount: campaign._count.members,
  };
}

/**
 * Join a campaign via invite code: creates PLAYER membership, a player
 * character at the starting location, a map marker, and adds the player to
 * the active scene.
 */
export async function joinCampaignByCode(
  code: string,
  userId: string,
  characterName?: string,
) {
  const campaign = await prisma.campaign.findUnique({
    where: { inviteCode: code },
    include: { _count: { select: { members: true } } },
  });
  if (!campaign) throw new NotFoundError("Invite", code);

  const existing = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId: campaign.id, userId } },
  });
  if (existing) return { campaignId: campaign.id, alreadyMember: true };

  if (campaign._count.members >= campaign.maxPlayers) {
    throw new AccessDeniedError("This campaign is full");
  }

  const startLocation = await prisma.location.findFirst({
    where: {
      campaignId: campaign.id,
      metadata: { path: ["isStartingLocation"], equals: true },
    },
  });

  const name = characterName?.trim() || "Adventurer";

  const result = await prisma.$transaction(async (tx) => {
    await tx.campaignMember.create({
      data: { campaignId: campaign.id, userId, role: "PLAYER" },
    });

    const character = await tx.character.create({
      data: {
        campaignId: campaign.id,
        userId,
        isPlayerCharacter: true,
        name,
        profile: { background: "A new arrival to the party." },
        locationId: startLocation?.id ?? null,
      },
    });

    await tx.mapMarker.create({
      data: {
        campaignId: campaign.id,
        markerType: "player",
        entityId: character.id,
        label: character.name,
        position: { x: 0.52, y: 0.55 },
      },
    });

    const scene = await tx.scene.findFirst({
      where: { campaignId: campaign.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });
    if (scene) {
      await tx.sceneParticipant.create({
        data: {
          sceneId: scene.id,
          userId,
          characterId: character.id,
          role: "player",
        },
      });
    }

    await appendCampaignEvent(tx, {
      campaignId: campaign.id,
      eventType: "member.joined",
      actorUserId: userId,
      payload: { characterId: character.id, characterName: name },
    });

    return { character, scene };
  });

  return {
    campaignId: campaign.id,
    alreadyMember: false,
    characterId: result.character.id,
  };
}
