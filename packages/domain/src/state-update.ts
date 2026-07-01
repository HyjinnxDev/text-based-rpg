import { stateDeltaSchema, worldTimeSchema, type StateDelta } from "@tbrpg/shared";
import { prisma, type Prisma } from "@tbrpg/db";
import { appendCampaignEvent } from "./event-log";

export class StateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StateValidationError";
  }
}

export function validateStateDelta(raw: unknown): StateDelta {
  const result = stateDeltaSchema.safeParse(raw);
  if (!result.success) {
    throw new StateValidationError(result.error.message);
  }
  return result.data;
}

export async function applyStateDelta(
  tx: Prisma.TransactionClient,
  campaignId: string,
  delta: StateDelta,
  actorUserId: string,
  sceneId?: string,
) {
  const campaign = await tx.campaign.findUniqueOrThrow({
    where: { id: campaignId },
  });

  if (delta.worldTime) {
    const current = worldTimeSchema.parse(campaign.worldTime);
    const merged = { ...current, ...delta.worldTime };
    await tx.campaign.update({
      where: { id: campaignId },
      data: { worldTime: merged },
    });
  }

  for (const update of delta.characterUpdates) {
    const character = await tx.character.findFirst({
      where: { id: update.characterId, campaignId },
    });
    if (!character) continue;

    const stats = update.stats
      ? { ...(character.stats as object), ...update.stats }
      : character.stats;

    await tx.character.update({
      where: { id: update.characterId },
      data: {
        stats: stats as Prisma.InputJsonValue,
        locationId: update.locationId ?? undefined,
      },
    });
  }

  for (const update of delta.npcUpdates) {
    const npc = await tx.npc.findFirst({
      where: { id: update.npcId, campaignId },
    });
    if (!npc) continue;

    const memory = (npc.memory as { events: string[] }) ?? { events: [] };
    if (update.memoryEvent) {
      memory.events.push(update.memoryEvent);
    }

    await tx.npc.update({
      where: { id: update.npcId },
      data: {
        locationId: update.locationId ?? undefined,
        memory,
        personality: update.mood
          ? { ...(npc.personality as object), mood: update.mood }
          : undefined,
      },
    });
  }

  for (const change of delta.inventoryChanges) {
    if (change.itemId) {
      const item = await tx.item.findFirst({
        where: { id: change.itemId, campaignId },
      });
      if (item) {
        const newQty = item.quantity + change.quantityDelta;
        if (newQty <= 0) {
          await tx.item.delete({ where: { id: item.id } });
        } else {
          await tx.item.update({
            where: { id: item.id },
            data: { quantity: newQty },
          });
        }
      }
    } else if (change.name && change.quantityDelta > 0) {
      await tx.item.create({
        data: {
          campaignId,
          name: change.name,
          category: change.category ?? "misc",
          quantity: change.quantityDelta,
          ownerType: change.ownerType,
          ownerId: change.ownerId,
        },
      });
    }
  }

  for (const qu of delta.questUpdates) {
    if (qu.questId) {
      await tx.quest.update({
        where: { id: qu.questId },
        data: { status: qu.status ?? undefined },
      });
    } else if (qu.title) {
      await tx.quest.create({
        data: {
          campaignId,
          title: qu.title,
          status: qu.status ?? "active",
        },
      });
    }
  }

  for (const cu of delta.codexUpdates) {
    await tx.codexEntry.upsert({
      where: { campaignId_slug: { campaignId, slug: cu.slug } },
      create: {
        campaignId,
        slug: cu.slug,
        category: cu.category,
        title: cu.title,
        content: cu.content as Prisma.InputJsonValue,
        visibility: (cu.visibility ?? { scope: "party" }) as Prisma.InputJsonValue,
      },
      update: {
        title: cu.title,
        content: cu.content as Prisma.InputJsonValue,
        visibility: (cu.visibility ?? { scope: "party" }) as Prisma.InputJsonValue,
        isStale: false,
        updatedAt: new Date(),
      },
    });
  }

  for (const pk of delta.playerKnowledge) {
    await tx.playerKnowledge.upsert({
      where: {
        campaignId_userId_knowledgeKey: {
          campaignId,
          userId: actorUserId,
          knowledgeKey: pk.knowledgeKey,
        },
      },
      create: {
        campaignId,
        userId: actorUserId,
        knowledgeKey: pk.knowledgeKey,
        category: pk.category,
        content: pk.content as Prisma.InputJsonValue,
        visibility: (pk.visibility ?? { scope: "private" }) as Prisma.InputJsonValue,
      },
      update: {
        content: pk.content as Prisma.InputJsonValue,
        visibility: (pk.visibility ?? { scope: "private" }) as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });
  }

  for (const mm of delta.mapMarkerUpdates) {
    if (mm.markerId) {
      await tx.mapMarker.update({
        where: { id: mm.markerId },
        data: {
          label: mm.label,
          position: mm.position as Prisma.InputJsonValue,
          locationId: mm.locationId,
          updatedAt: new Date(),
        },
      });
    } else {
      await tx.mapMarker.create({
        data: {
          campaignId,
          markerType: mm.markerType,
          entityId: mm.entityId,
          label: mm.label,
          position: mm.position as Prisma.InputJsonValue,
          locationId: mm.locationId,
        },
      });
    }
  }

  const worldTime = delta.worldTime
    ? worldTimeSchema.parse({ ...worldTimeSchema.parse(campaign.worldTime), ...delta.worldTime })
    : worldTimeSchema.parse(campaign.worldTime);

  await appendCampaignEvent(tx, {
    campaignId,
    eventType: "state.applied",
    actorUserId,
    sceneId,
    payload: { meaningful: delta.meaningful },
    stateDelta: delta as unknown as Record<string, unknown>,
    inWorldTime: worldTime as unknown as Record<string, unknown>,
  });

  return { worldTime };
}
