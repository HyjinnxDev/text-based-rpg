import { afterEach, describe, expect, it } from "vitest";
import { resolveGoogleApiKey } from "./env";
import { createAiRouterFromEnv } from "./router";

const ENV_KEYS = [
  "GEMINI_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "gemini_key",
  "AI_PROVIDER",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
] as const;

function clearEnv() {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

describe("resolveGoogleApiKey", () => {
  afterEach(clearEnv);

  it("prefers GEMINI_KEY", () => {
    process.env.GEMINI_KEY = "gemini-primary";
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "google-secondary";
    expect(resolveGoogleApiKey()).toBe("gemini-primary");
  });

  it("falls back to GOOGLE_GENERATIVE_AI_API_KEY", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "google-key";
    expect(resolveGoogleApiKey()).toBe("google-key");
  });

  it("accepts lowercase gemini_key", () => {
    process.env.gemini_key = "lowercase-key";
    expect(resolveGoogleApiKey()).toBe("lowercase-key");
  });
});

describe("createAiRouterFromEnv", () => {
  afterEach(clearEnv);

  it("defaults primary to google when only GEMINI_KEY is set", () => {
    process.env.GEMINI_KEY = "test-key";
    const router = createAiRouterFromEnv();
    expect(router).toBeDefined();
  });

  it("respects explicit AI_PROVIDER=mock", () => {
    process.env.GEMINI_KEY = "test-key";
    process.env.AI_PROVIDER = "mock";
    const router = createAiRouterFromEnv();
    expect(router).toBeDefined();
  });
});
