import type { AiProviderName } from "./types";

/** Gemini API key — used for image generation (maps, portraits, landscapes). */
export function resolveGoogleApiKey(): string | undefined {
  return (
    process.env.GEMINI_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.gemini_key ||
    undefined
  );
}

/** Text/chat LLM primary provider. Gemini key alone does not select google for text. */
export function resolveTextPrimaryProvider(): AiProviderName {
  const explicit = process.env.AI_PROVIDER as AiProviderName | undefined;
  if (explicit) return explicit;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "mock";
}

export function resolveGeminiImageModel(): string {
  return process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
}
