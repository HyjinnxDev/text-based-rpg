import type { CampaignMemberRole, Prisma } from "@tbrpg/db";
import { prisma } from "@tbrpg/db";
import { AccessDeniedError } from "./permissions";

/** Scopes any campaign member can see without being a participant. */
const OPEN_SCOPES = ["PUBLIC", "PARTY"] as const;

/**
 * Prisma where-fragment limiting scenes to those the user may see.
 * Hosts see everything; players see open scopes plus scenes they participate in.
 */
export function sceneVisibilityWhere(
  userId: string,
  memberRole: CampaignMemberRole,
): Prisma.SceneWhereInput {
  if (memberRole === "HOST") return {};
  return {
    OR: [
      { scope: { in: [...OPEN_SCOPES] } },
      { participants: { some: { userId } } },
    ],
  };
}

/** Throws unless the user may access the scene. Returns the scene. */
export async function assertSceneAccess(
  sceneId: string,
  campaignId: string,
  userId: string,
  memberRole: CampaignMemberRole,
) {
  const scene = await prisma.scene.findFirst({
    where: { id: sceneId, campaignId },
    include: { participants: { select: { userId: true } } },
  });
  if (!scene) return null;

  if (memberRole === "HOST") return scene;
  if ((OPEN_SCOPES as readonly string[]).includes(scene.scope)) return scene;
  if (scene.participants.some((p) => p.userId === userId)) return scene;

  throw new AccessDeniedError("You do not have access to this scene");
}
