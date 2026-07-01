import { prisma, type Prisma } from "@tbrpg/db";

export async function getNextEventSequence(
  tx: Prisma.TransactionClient,
  campaignId: string,
): Promise<number> {
  const last = await tx.campaignEvent.findFirst({
    where: { campaignId },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });
  return (last?.sequence ?? 0) + 1;
}

export async function appendCampaignEvent(
  tx: Prisma.TransactionClient,
  data: {
    campaignId: string;
    eventType: string;
    actorUserId?: string;
    sceneId?: string;
    payload?: Record<string, unknown>;
    stateDelta?: Record<string, unknown>;
    inWorldTime?: Record<string, unknown>;
  },
) {
  const sequence = await getNextEventSequence(tx, data.campaignId);
  return tx.campaignEvent.create({
    data: {
      campaignId: data.campaignId,
      sequence,
      eventType: data.eventType,
      actorUserId: data.actorUserId,
      sceneId: data.sceneId,
    payload: (data.payload ?? {}) as Prisma.InputJsonValue,
      stateDelta: data.stateDelta as Prisma.InputJsonValue | undefined,
      inWorldTime: data.inWorldTime as Prisma.InputJsonValue | undefined,
    },
  });
}
