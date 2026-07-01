import type { CampaignMemberRole, UserRole } from "@tbrpg/db";
import { prisma } from "@tbrpg/db";

export class AccessDeniedError extends Error {
  constructor(message = "Access denied") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

export async function assertCampaignAccess(
  campaignId: string,
  userId: string,
  minRole: CampaignMemberRole = "PLAYER",
) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new NotFoundError("Campaign", campaignId);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.role === "ADMIN") return { campaign, memberRole: "HOST" as CampaignMemberRole };

  if (campaign.hostUserId === userId) {
    return { campaign, memberRole: "HOST" as CampaignMemberRole };
  }

  const member = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId, userId } },
  });

  if (!member) throw new AccessDeniedError();

  const roleRank: Record<CampaignMemberRole, number> = {
    OBSERVER: 1,
    PLAYER: 2,
    HOST: 3,
  };

  if (roleRank[member.role] < roleRank[minRole]) {
    throw new AccessDeniedError();
  }

  return { campaign, memberRole: member.role };
}

export async function assertHost(campaignId: string, userId: string) {
  return assertCampaignAccess(campaignId, userId, "HOST");
}
