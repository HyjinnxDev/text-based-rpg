import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@tbrpg/db";
import { createCampaign, resolvePlayerAction, exportCampaign } from "@tbrpg/domain";
import { createCampaignSchema } from "@tbrpg/shared";
import { AiRouter } from "@tbrpg/ai";

const ai = new AiRouter({ primary: "mock" });

describe("campaign isolation and persistence", () => {
  let userA: string;
  let userB: string;

  beforeAll(async () => {
    const a = await prisma.user.create({
      data: { email: `a-${Date.now()}@test.local`, name: "Player A" },
    });
    const b = await prisma.user.create({
      data: { email: `b-${Date.now()}@test.local`, name: "Player B" },
    });
    userA = a.id;
    userB = b.id;
  });

  afterAll(async () => {
    await prisma.campaign.deleteMany({
      where: { hostUserId: { in: [userA, userB] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
    await prisma.$disconnect();
  });

  it("creates isolated campaigns from rough idea", async () => {
    const input = createCampaignSchema.parse({
      generationMode: "rough_idea",
      roughIdea: "A haunted lighthouse auction on a storm-lashed island.",
      mode: "SOLO",
    });

    const result = await createCampaign(userA, input, ai);
    expect(result.campaign.title).toBeTruthy();
    expect(result.scene).toBeTruthy();

    const exported = await exportCampaign(result.campaign.id, userA);
    expect(exported.campaign.locations.length).toBeGreaterThan(0);
    expect(exported.campaign.events.length).toBeGreaterThan(0);
  });

  it("denies cross-campaign access", async () => {
    const input = createCampaignSchema.parse({
      generationMode: "rough_idea",
      roughIdea: "Secret vault beneath a desert monastery.",
      mode: "SOLO",
    });
    const { campaign } = await createCampaign(userA, input, ai);

    await expect(getCampaignSafe(campaign.id, userB)).rejects.toThrow();
  });

  it("persists freeform action with codex update and events", async () => {
    const input = createCampaignSchema.parse({
      generationMode: "rough_idea",
      roughIdea: "River pirates negotiate with a reluctant oracle.",
      mode: "SOLO",
    });
    const { campaign, scene } = await createCampaign(userA, input, ai);

    const beforeEvents = await prisma.campaignEvent.count({
      where: { campaignId: campaign.id },
    });

    const result = await resolvePlayerAction(
      campaign.id,
      userA,
      "I offer the oracle a trade manifest as proof of good faith.",
      scene.id,
      ai,
    );

    expect(result.narration.toLowerCase()).toContain("oracle");

    const afterEvents = await prisma.campaignEvent.count({
      where: { campaignId: campaign.id },
    });
    expect(afterEvents).toBeGreaterThan(beforeEvents);

    const codex = await prisma.codexEntry.findMany({
      where: { campaignId: campaign.id, category: "history" },
    });
    expect(codex.length).toBeGreaterThan(0);

    const knowledge = await prisma.playerKnowledge.findFirst({
      where: { campaignId: campaign.id, userId: userA },
    });
    expect(knowledge).toBeTruthy();
  });
});

async function getCampaignSafe(campaignId: string, userId: string) {
  const { getCampaign } = await import("@tbrpg/domain");
  return getCampaign(campaignId, userId);
}
