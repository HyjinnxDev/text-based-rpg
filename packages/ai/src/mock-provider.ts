import {
  stateDeltaSchema,
  generatedCampaignSchema,
  type StateDelta,
  type GeneratedCampaign,
} from "@tbrpg/shared";
import type {
  AiProvider,
  AiTextRequest,
  AiTextResponse,
  SceneContext,
  CampaignGenerationContext,
} from "./types";

export class MockAiProvider implements AiProvider {
  readonly name = "mock" as const;

  async generateText<T>(request: AiTextRequest): Promise<AiTextResponse<T>> {
    const userMsg = request.messages.find((m) => m.role === "user")?.content ?? "";

    if (request.taskType === "campaign_generation") {
      const structured = generatedCampaignSchema.parse({
        title: "The Shattered Compass",
        premise: userMsg.slice(0, 200),
        worldHistory: "An age of fractured trade routes left harbors hungry for new leaders.",
        currentSituation: "Tensions rise as rival companies bid for dock rights.",
        startingLocation: {
          name: "Harbor of Salt",
          description: "A wind-bitten port of rope, rust, and whispered contracts.",
          lng: 12.5,
          lat: 41.9,
        },
        factions: [
          { name: "Salt Merchants Guild", description: "Controls grain imports." },
        ],
        npcs: [
          {
            name: "Mara Vell",
            role: "Dock factor",
            personality: "Dry wit, sharp memory for debts",
            goals: "Keep the harbor profitable without open war",
          },
        ],
        storyThreads: [
          {
            title: "The Missing Manifest",
            description: "A cargo ledger vanished the night before auction.",
          },
        ],
        rumours: ["Someone is buying debts along the lower wharves."],
      }) satisfies GeneratedCampaign;

      return {
        text: JSON.stringify(structured),
        structured: structured as T,
        provider: "mock",
        model: "mock-campaign-v1",
        usage: { inputTokens: 100, outputTokens: 400 },
      };
    }

    if (request.taskType === "scene_resolution") {
      const action = userMsg.includes("Action:")
        ? userMsg.split("Action:").pop()?.trim() ?? userMsg
        : userMsg;

      const structured = stateDeltaSchema.parse({
        narration: `You attempt to ${action.toLowerCase()}. The world responds — consequences ripple through Harbor of Salt.`,
        worldTime: { hour: 9 },
        meaningful: true,
        codexUpdates: [
          {
            slug: `event-${Date.now()}`,
            category: "history",
            title: "Recent events",
            content: { body: `The player tried to: ${action}` },
            visibility: { scope: "party" },
          },
        ],
        playerKnowledge: [
          {
            knowledgeKey: `action-${action.slice(0, 32).replace(/\s+/g, "-").toLowerCase()}`,
            category: "discovery",
            content: { summary: action },
            visibility: { scope: "private" },
          },
        ],
      }) satisfies StateDelta;

      return {
        text: structured.narration,
        structured: structured as T,
        provider: "mock",
        model: "mock-scene-v1",
        usage: { inputTokens: 50, outputTokens: 150 },
      };
    }

    return {
      text: "Mock response.",
      provider: "mock",
      model: "mock-v1",
      usage: { inputTokens: 10, outputTokens: 10 },
    };
  }
}

export function buildScenePrompt(ctx: SceneContext, action: string): string {
  return `Campaign: ${ctx.campaignTitle}
Location: ${ctx.locationName}
${ctx.locationDescription ?? ""}
Character: ${ctx.characterName}
World time: ${JSON.stringify(ctx.worldTime)}
Recent events: ${ctx.recentEvents.join("; ") || "None"}

Action: ${action}

Respond with JSON matching the state delta schema. Include narration and any state changes.`;
}

export function buildCampaignPrompt(ctx: CampaignGenerationContext): string {
  return `Generation mode: ${ctx.generationMode}
${ctx.prompt}

Return JSON only for a complete campaign foundation.`;
}
