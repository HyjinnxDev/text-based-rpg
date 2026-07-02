export type AiImageTaskType =
  | "campaign_map"
  | "location_landscape"
  | "character_portrait"
  | "npc_portrait";

export type AiImageAspectRatio =
  | "1:1"
  | "3:4"
  | "4:3"
  | "9:16"
  | "16:9"
  | "21:9";

export interface AiImageRequest {
  taskType: AiImageTaskType;
  prompt: string;
  aspectRatio?: AiImageAspectRatio;
}

export interface AiImageResult {
  /** PNG or WebP bytes */
  data: Uint8Array;
  mediaType: string;
  model: string;
  taskType: AiImageTaskType;
}

export interface AiImageProvider {
  generateImage(request: AiImageRequest): Promise<AiImageResult>;
}
