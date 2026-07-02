import { z } from "zod";

/** Map tiles + preview image stored after Gemini generation at campaign create. */
export const campaignMapConfigSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  minZoom: z.number().int().min(0),
  maxZoom: z.number().int().min(0),
  /** Full map preview (single image) */
  imageUrl: z.string(),
  /** MapLibre raster template — {z} {x} {y} replaced client-side */
  tileUrlTemplate: z.string(),
});

export type CampaignMapConfig = z.infer<typeof campaignMapConfigSchema>;

export function parseCampaignMapConfig(settings: unknown): CampaignMapConfig | null {
  if (!settings || typeof settings !== "object") return null;
  const map = (settings as { map?: unknown }).map;
  const parsed = campaignMapConfigSchema.safeParse(map);
  return parsed.success ? parsed.data : null;
}

/** Normalized 0–1 position on the campaign map image (lng/lat kept for legacy). */
export function readMapPosition(position: { lng?: number; lat?: number; x?: number; y?: number }) {
  const x = position.x ?? position.lng ?? 0.5;
  const y = position.y ?? position.lat ?? 0.5;
  return { x, y };
}
