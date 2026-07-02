import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateImage } from "ai";
import type { AiImageProvider, AiImageRequest, AiImageResult } from "./image-types";
import { AiProviderError } from "./types";

const DEFAULT_ASPECT: Record<AiImageRequest["taskType"], AiImageRequest["aspectRatio"]> = {
  campaign_map: "1:1",
  location_landscape: "16:9",
  character_portrait: "3:4",
  npc_portrait: "3:4",
};

export function createGeminiImageProvider(
  apiKey: string,
  modelId = "gemini-2.5-flash-image",
): AiImageProvider {
  const google = createGoogleGenerativeAI({ apiKey });

  return {
    async generateImage(request: AiImageRequest): Promise<AiImageResult> {
      try {
        const aspectRatio = request.aspectRatio ?? DEFAULT_ASPECT[request.taskType];

        const { image } = await generateImage({
          model: google.image(modelId),
          prompt: request.prompt,
          aspectRatio,
        });

        return {
          data: image.uint8Array,
          mediaType: image.mediaType,
          model: modelId,
          taskType: request.taskType,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Image generation failed";
        throw new AiProviderError(message, "google", true);
      }
    },
  };
}
