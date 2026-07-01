import { prisma } from "@tbrpg/db";
import { stateDeltaSchema } from "@tbrpg/shared";
import type { AiRouter } from "@tbrpg/ai";
import { buildScenePrompt } from "@tbrpg/ai";
import { assertCampaignAccess, NotFoundError } from "./permissions";
import { applyStateDelta, validateStateDelta } from "./state-update";
import { appendCampaignEvent } from "./event-log";
import { planBroadcast, sceneScopeToVisibility } from "./broadcast";
import { releaseActionReservation, reserveActionSlot, withCampaignLock } from "./redis";
import type { RealtimeRoom } from "@tbrpg/shared";

export interface ActionIntentInput {
  campaignId: string;
  userId: string;
  sceneId?: string;
  intent: string;
  clientRequestId: string;
}

export interface ConfirmedActionResult {
  pendingActionId: string;
  clientRequestId: string;
  campaignId: string;
  sceneId?: string;
  narration: string;
  worldTime: Record<string, unknown>;
  campaignEventSequence: number;
  mapMarkers: Array<{
    id: string;
    label: string;
    markerType: string;
    position: { lng: number; lat: number };
    entityId?: string;
  }>;
  codexUpdates: Array<{
    id: string;
    slug: string;
    category: string;
    title: string;
    content: Record<string, unknown>;
  }>;
  broadcast: { rooms: RealtimeRoom[]; visibility: { scope: string } };
}

/** Step 1–2: Validate and queue intent (no AI, no state mutation) */
export async function submitActionIntent(input: ActionIntentInput) {
  const { campaign } = await assertCampaignAccess(input.campaignId, input.userId, "PLAYER");

  const reserved = await reserveActionSlot(
    input.campaignId,
    input.userId,
    input.clientRequestId,
  );
  if (!reserved) {
    throw new Error("You already have an action in progress");
  }

  const scene =
    input.sceneId != null
      ? await prisma.scene.findFirst({
          where: { id: input.sceneId, campaignId: input.campaignId },
        })
      : await prisma.scene.findFirst({
          where: { campaignId: input.campaignId, status: "ACTIVE" },
          orderBy: { updatedAt: "desc" },
        });

  if (!scene) throw new NotFoundError("Scene", input.sceneId ?? "active");

  const pending = await prisma.pendingAction.create({
    data: {
      campaignId: input.campaignId,
      userId: input.userId,
      sceneId: scene.id,
      status: "PENDING",
      intent: { action: input.intent, clientRequestId: input.clientRequestId },
      aiTaskType: "scene_resolution",
    },
  });

  return {
    pendingActionId: pending.id,
    clientRequestId: input.clientRequestId,
    sceneId: scene.id,
    campaignTitle: campaign.title,
  };
}

/** Steps 3–6: Resolve intent with domain validation, lock, transaction, AI */
export async function resolveActionIntent(
  pendingActionId: string,
  ai: AiRouter,
): Promise<ConfirmedActionResult> {
  const pending = await prisma.pendingAction.findUnique({
    where: { id: pendingActionId },
    include: { scene: true },
  });

  if (!pending) throw new NotFoundError("PendingAction", pendingActionId);
  if (pending.status === "COMPLETED") {
    throw new Error("Action already resolved");
  }

  const intent = pending.intent as { action: string; clientRequestId: string };
  const { campaignId, userId, sceneId } = pending;

  return withCampaignLock(campaignId, async () => {
    await prisma.pendingAction.update({
      where: { id: pendingActionId },
      data: { status: "PROCESSING" },
    });

    try {
      const { campaign } = await assertCampaignAccess(campaignId, userId, "PLAYER");

      const character = await prisma.character.findFirst({
        where: { campaignId, userId, isPlayerCharacter: true },
      });
      if (!character) throw new NotFoundError("Character", userId);

      const scene = sceneId
        ? await prisma.scene.findFirst({ where: { id: sceneId, campaignId } })
        : null;
      if (!scene) throw new NotFoundError("Scene", sceneId ?? "unknown");

      const location = scene.locationId
        ? await prisma.location.findUnique({ where: { id: scene.locationId } })
        : null;

      const recentEvents = await prisma.campaignEvent.findMany({
        where: { campaignId },
        orderBy: { sequence: "desc" },
        take: 5,
        select: { eventType: true },
      });

      const response = await ai.generateText({
        taskType: "scene_resolution",
        messages: [
          {
            role: "system",
            content:
              "You are a tabletop RPG game master. Return JSON matching the state delta schema.",
          },
          {
            role: "user",
            content: buildScenePrompt(
              {
                campaignTitle: campaign.title,
                premise: campaign.premise ?? undefined,
                locationName: location?.name ?? "Unknown",
                locationDescription: location?.description ?? undefined,
                characterName: character.name,
                worldTime: campaign.worldTime as Record<string, unknown>,
                recentEvents: recentEvents.map((e) => e.eventType),
              },
              intent.action,
            ),
          },
        ],
        structuredSchema: stateDeltaSchema,
      });

      const delta = validateStateDelta(
        response.structured ?? { narration: response.text },
      );

      let lastSequence = 0;

      const applied = await prisma.$transaction(async (tx) => {
        const submitted = await appendCampaignEvent(tx, {
          campaignId,
          eventType: "action.submitted",
          actorUserId: userId,
          sceneId: scene.id,
          payload: { action: intent.action, clientRequestId: intent.clientRequestId },
        });

        const result = await applyStateDelta(tx, campaignId, delta, userId, scene.id);

        await tx.scene.update({
          where: { id: scene.id },
          data: { updatedAt: new Date() },
        });

        lastSequence = submitted.sequence;
        return result;
      });

      const mapMarkers = await prisma.mapMarker.findMany({ where: { campaignId } });
      const codex = await prisma.codexEntry.findMany({
        where: { campaignId },
        orderBy: { updatedAt: "desc" },
        take: 10,
      });

      const broadcast = planBroadcast({
        campaignId,
        sceneId: scene.id,
        sceneScope: scene.scope,
        actorUserId: userId,
        visibility: sceneScopeToVisibility(scene.scope),
      });

      await prisma.pendingAction.update({
        where: { id: pendingActionId },
        data: { status: "COMPLETED" },
      });

      await releaseActionReservation(campaignId, userId);

      return {
        pendingActionId,
        clientRequestId: intent.clientRequestId,
        campaignId,
        sceneId: scene.id,
        narration: delta.narration,
        worldTime: applied.worldTime as Record<string, unknown>,
        campaignEventSequence: lastSequence,
        mapMarkers: mapMarkers.map((m) => ({
          id: m.id,
          label: m.label,
          markerType: m.markerType,
          position: m.position as { lng: number; lat: number },
          entityId: m.entityId ?? undefined,
        })),
        codexUpdates: codex.map((c) => ({
          id: c.id,
          slug: c.slug,
          category: c.category,
          title: c.title,
          content: c.content as Record<string, unknown>,
        })),
        broadcast,
      };
    } catch (error) {
      await prisma.pendingAction.update({
        where: { id: pendingActionId },
        data: {
          status: "FAILED",
          lastError: error instanceof Error ? error.message : "Unknown error",
          retryCount: { increment: 1 },
        },
      });
      if (userId) await releaseActionReservation(campaignId, userId);
      throw error;
    }
  });
}

/** Build catch-up state for reconnecting clients */
export async function buildCatchUpState(
  campaignId: string,
  userId: string,
  lastEventSequence = 0,
) {
  await assertCampaignAccess(campaignId, userId, "OBSERVER");

  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
  });

  const events = await prisma.campaignEvent.findMany({
    where: { campaignId, sequence: { gt: lastEventSequence } },
    orderBy: { sequence: "asc" },
    take: 100,
  });

  const mapMarkers = await prisma.mapMarker.findMany({ where: { campaignId } });

  return {
    campaignId,
    worldTime: campaign.worldTime as {
      day: number;
      hour: number;
      season: string;
      calendarLabel: string;
    },
    recentEvents: events.map((e) => ({
      campaignId,
      sequence: e.sequence,
      eventType: e.eventType,
      actorUserId: e.actorUserId,
      sceneId: e.sceneId,
      payload: e.payload as Record<string, unknown>,
      inWorldTime: e.inWorldTime as Record<string, unknown> | undefined,
      visibility: { scope: "party" as const },
    })),
    presence: { campaignId, players: [] },
    mapMarkers: mapMarkers.map((m) => ({
      id: m.id,
      label: m.label,
      markerType: m.markerType,
      position: m.position as { lng: number; lat: number },
      entityId: m.entityId ?? undefined,
    })),
  };
}
