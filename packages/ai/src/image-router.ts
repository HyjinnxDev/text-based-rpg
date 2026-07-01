import { resolveGeminiImageModel, resolveGoogleApiKey } from "./env";
import { createGeminiImageProvider } from "./gemini-image-provider";
import type { AiImageProvider, AiImageRequest, AiImageResult } from "./image-types";

export class AiImageRouter {
  private provider: AiImageProvider | null;

  constructor(provider: AiImageProvider | null) {
    this.provider = provider;
  }

  get enabled(): boolean {
    return this.provider !== null;
  }

  async generateImage(request: AiImageRequest): Promise<AiImageResult | null> {
    if (!this.provider) return null;
    return this.provider.generateImage(request);
  }
}

export function createAiImageRouterFromEnv(): AiImageRouter {
  const apiKey = resolveGoogleApiKey();
  if (!apiKey) return new AiImageRouter(null);

  return new AiImageRouter(
    createGeminiImageProvider(apiKey, resolveGeminiImageModel()),
  );
}
