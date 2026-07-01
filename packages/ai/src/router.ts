import type { AiProvider, AiProviderName, AiTextRequest, AiTextResponse } from "./types";
import { MockAiProvider } from "./mock-provider";
import { createLiveProvider } from "./live-providers";
import { resolveGoogleApiKey } from "./env";

export interface AiRouterConfig {
  primary: AiProviderName;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  googleApiKey?: string;
}

export class AiRouter {
  private providers: Map<AiProviderName, AiProvider> = new Map();

  constructor(config: AiRouterConfig) {
    this.providers.set("mock", new MockAiProvider());

    if (config.openaiApiKey) {
      this.providers.set("openai", createLiveProvider("openai", config.openaiApiKey));
    }
    if (config.anthropicApiKey) {
      this.providers.set("anthropic", createLiveProvider("anthropic", config.anthropicApiKey));
    }
    if (config.googleApiKey) {
      this.providers.set("google", createLiveProvider("google", config.googleApiKey));
    }

    this.primary = config.primary;
  }

  private primary: AiProviderName;

  async generateText<T>(request: AiTextRequest): Promise<AiTextResponse<T>> {
    const order: AiProviderName[] = [
      this.primary,
      "mock",
      "openai",
      "anthropic",
      "google",
    ];

    let lastError: Error | undefined;
    for (const name of [...new Set(order)]) {
      const provider = this.providers.get(name);
      if (!provider) continue;
      try {
        return await provider.generateText<T>(request);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError ?? new Error("No AI provider available");
  }
}

export function createAiRouterFromEnv(): AiRouter {
  const googleApiKey = resolveGoogleApiKey();
  const envPrimary = process.env.AI_PROVIDER as AiProviderName | undefined;
  const primary =
    envPrimary ??
    (googleApiKey && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY
      ? "google"
      : "mock");

  return new AiRouter({
    primary,
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    googleApiKey,
  });
}
