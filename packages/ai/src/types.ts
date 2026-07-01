import type { z } from "zod";
import type { StateDelta, GeneratedCampaign } from "@tbrpg/shared";

export type AiProviderName = "mock" | "openai" | "anthropic" | "google";

export type AiTaskType =
  | "campaign_generation"
  | "scene_resolution"
  | "codex_maintenance"
  | "narration"
  | "state_validation";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiTextRequest {
  taskType: AiTaskType;
  messages: AiMessage[];
  temperature?: number;
  structuredSchema?: z.ZodType;
}

export interface AiTextResponse<T = unknown> {
  text: string;
  structured?: T;
  provider: AiProviderName;
  model: string;
  usage: { inputTokens?: number; outputTokens?: number };
}

export interface AiProvider {
  readonly name: AiProviderName;
  generateText<T>(request: AiTextRequest): Promise<AiTextResponse<T>>;
}

export interface SceneContext {
  campaignTitle: string;
  premise?: string;
  locationName: string;
  locationDescription?: string;
  characterName: string;
  worldTime: Record<string, unknown>;
  recentEvents: string[];
}

export interface CampaignGenerationContext {
  generationMode: string;
  prompt: string;
}

export type SceneResolutionResult = StateDelta;
export type CampaignGenerationResult = GeneratedCampaign;

export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: AiProviderName,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}
