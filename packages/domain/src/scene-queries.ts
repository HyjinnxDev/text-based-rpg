import { prisma } from "@tbrpg/db";
import { assertCampaignAccess, NotFoundError } from "./permissions";

export async function getSceneState(campaignId: string, userId: string, sceneId: string) {
  await assertCampaignAccess(campaignId, userId, "OBSERVER");

  const scene = await prisma.scene.findFirst({
    where: { id: sceneId, campaignId },
    include: {
      location: true,
      participants: { include: { character: true, npc: true } },
    },
  });
  if (!scene) throw new NotFoundError("Scene", sceneId);

  const events = await prisma.campaignEvent.findMany({
    where: { campaignId, sceneId },
    orderBy: { sequence: "asc" },
    take: 50,
  });

  return { scene, events };
}
