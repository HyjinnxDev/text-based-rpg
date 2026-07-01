import { afterEach, describe, expect, it } from "vitest";
import { resolveGoogleApiKey, resolveTextPrimaryProvider } from "./env";
import { buildImagePrompt } from "./image-prompts";
import { createAiImageRouterFromEnv } from "./image-router";
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

describe("resolveTextPrimaryProvider", () => {
  afterEach(clearEnv);

  it("prefers anthropic when key is set and AI_PROVIDER unset", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant";
    process.env.GEMINI_KEY = "gemini-img";
    expect(resolveTextPrimaryProvider()).toBe("anthropic");
  });

  it("does not pick google from GEMINI_KEY alone", () => {
    process.env.GEMINI_KEY = "gemini-img";
    expect(resolveTextPrimaryProvider()).toBe("mock");
  });

  it("respects explicit AI_PROVIDER", () => {
    process.env.AI_PROVIDER = "mock";
    process.env.ANTHROPIC_API_KEY = "sk-ant";
    expect(resolveTextPrimaryProvider()).toBe("mock");
  });
});

describe("createAiRouterFromEnv", () => {
  afterEach(clearEnv);

  it("uses anthropic for text when both anthropic and gemini keys exist", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant";
    process.env.GEMINI_KEY = "gemini-img";
    expect(createAiRouterFromEnv()).toBeDefined();
    expect(resolveTextPrimaryProvider()).toBe("anthropic");
  });
});

describe("createAiImageRouterFromEnv", () => {
  afterEach(clearEnv);

  it("enables image router when GEMINI_KEY is set", () => {
    process.env.GEMINI_KEY = "test-key";
    const router = createAiImageRouterFromEnv();
    expect(router.enabled).toBe(true);
  });

  it("disables image router without a gemini key", () => {
    const router = createAiImageRouterFromEnv();
    expect(router.enabled).toBe(false);
  });
});

describe("buildImagePrompt", () => {
  it("builds a top-down map prompt", () => {
    const prompt = buildImagePrompt("campaign_map", {
      title: "Salt Merchants",
      premise: "A harbor in civil war",
      regions: [{ name: "Lower Wharf", description: "rotting piers" }],
    });
    expect(prompt).toContain("Top-down fantasy world map");
    expect(prompt).toContain("Salt Merchants");
  });

  it("builds a portrait prompt", () => {
    const prompt = buildImagePrompt("character_portrait", {
      name: "Mara Vell",
      role: "dock factor",
    });
    expect(prompt).toContain("Mara Vell");
    expect(prompt).toContain("portrait");
  });
});
