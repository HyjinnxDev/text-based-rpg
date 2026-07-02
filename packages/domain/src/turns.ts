import type { Prisma } from "@tbrpg/db";
import { prisma } from "@tbrpg/db";
import { appendCampaignEvent } from "./event-log";
import { assertCampaignAccess, assertHost, AccessDeniedError } from "./permissions";

export type TurnMode = "free" | "rounds";

interface TurnMeta {
  turnMode?: TurnMode;
  round?: number;
  actedUserIds?: string[];
}

function readTurnMeta(metadata: unknown): Required<TurnMeta> {
  const meta = (metadata ?? {}) as TurnMeta;
  return {
    turnMode: meta.turnMode === "rounds" ? "rounds" : "free",
    round: meta.round ?? 1,
    actedUserIds: meta.actedUserIds ?? [],
  };
}

/** Player-role members expected to act each round. */
async function listExpectedActors(campaignId: string) {
  const members = await prisma.campaignMember.findMany({
    where: { campaignId, role: { in: ["HOST", "PLAYER"] } },
    select: { userId: true, user: { select: { name: true, email: true } } },
  });
  return members.map((m) => ({
    userId: m.userId,
    name: m.user.name ?? m.user.email,
  }));
}

export async function getTurnState(campaignId: string, userId: string, sceneId: string) {
  const { memberRole } = await assertCampaignAccess(campaignId, userId, "OBSERVER");
  return getTurnStateWithRole(campaignId, userId, sceneId, memberRole);
}

/** Variant for callers that already verified campaign access. */
export async function getTurnStateWithRole(
  campaignId: string,
  userId: string,
  sceneId: string,
  memberRole: import("@tbrpg/db").CampaignMemberRole,
) {
  const scene = await prisma.scene.findFirst({
    where: { id: sceneId, campaignId },
    select: { metadata: true },
  });
  if (!scene) return null;

  const meta = readTurnMeta(scene.metadata);
  const expected = await listExpectedActors(campaignId);
  const waitingOn = expected.filter((a) => !meta.actedUserIds.includes(a.userId));

  return {
    viewerRole: memberRole,
    turnMode: meta.turnMode,
    round: meta.round,
    actedUserIds: meta.actedUserIds,
    waitingOn: meta.turnMode === "rounds" ? waitingOn : [],
    youHaveActed: meta.turnMode === "rounds" && meta.actedUserIds.includes(userId),
  };
}

/** Host-only: switch a scene between free-form and round-based turns. */
export async function setTurnMode(
  campaignId: string,
  userId: string,
  sceneId: string,
  mode: TurnMode,
) {
  await assertHost(campaignId, userId);
  const scene = await prisma.scene.findFirst({
    where: { id: sceneId, campaignId },
    select: { id: true, metadata: true },
  });
  if (!scene) return null;

  const metadata = {
    ...((scene.metadata ?? {}) as Record<string, unknown>),
    turnMode: mode,
    round: 1,
    actedUserIds: [],
  };

  await prisma.scene.update({
    where: { id: scene.id },
    data: { metadata: metadata as Prisma.InputJsonValue },
  });

  await appendCampaignEvent(prisma, {
    campaignId,
    eventType: "turn.mode_changed",
    actorUserId: userId,
    sceneId,
    payload: { mode },
  });

  return getTurnState(campaignId, userId, sceneId);
}

/** Throws if rounds mode is on and the user already acted this round. */
export function assertMayActThisRound(sceneMetadata: unknown, userId: string) {
  const meta = readTurnMeta(sceneMetadata);
  if (meta.turnMode !== "rounds") return;
  if (meta.actedUserIds.includes(userId)) {
    throw new AccessDeniedError(
      `You have already acted this round (round ${meta.round}). Wait for the others.`,
    );
  }
}

/**
 * Records a resolved action for the round. Advances the round when every
 * expected actor has acted. Call after a successful resolution.
 */
export async function recordTurnAction(
  tx: Prisma.TransactionClient,
  campaignId: string,
  sceneId: string,
  userId: string,
) {
  const scene = await tx.scene.findUnique({
    where: { id: sceneId },
    select: { metadata: true },
  });
  if (!scene) return;

  const meta = readTurnMeta(scene.metadata);
  if (meta.turnMode !== "rounds") return;

  const acted = [...new Set([...meta.actedUserIds, userId])];
  const expected = await listExpectedActors(campaignId);
  const roundComplete = expected.every((a) => acted.includes(a.userId));

  const metadata = {
    ...((scene.metadata ?? {}) as Record<string, unknown>),
    round: roundComplete ? meta.round + 1 : meta.round,
    actedUserIds: roundComplete ? [] : acted,
  };

  await tx.scene.update({
    where: { id: sceneId },
    data: { metadata: metadata as Prisma.InputJsonValue },
  });

  if (roundComplete) {
    await appendCampaignEvent(tx, {
      campaignId,
      eventType: "turn.round_advanced",
      sceneId,
      payload: { round: meta.round + 1 },
    });
  }
}
