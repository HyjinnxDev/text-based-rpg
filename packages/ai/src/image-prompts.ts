import type { AiImageTaskType } from "./image-types";

export interface CampaignMapPromptInput {
  title: string;
  premise?: string;
  tone?: string;
  genre?: string;
  regions?: Array<{ name: string; description: string }>;
}

export interface PortraitPromptInput {
  name: string;
  role?: string;
  description?: string;
  tone?: string;
}

export interface LandscapePromptInput {
  locationName: string;
  description?: string;
  timeOfDay?: string;
  tone?: string;
}

const STYLE_PREFIX =
  "Fantasy RPG illustration, painterly, cohesive world aesthetic, no text labels, no UI, no watermark.";

export function buildImagePrompt(
  taskType: AiImageTaskType,
  input: CampaignMapPromptInput | PortraitPromptInput | LandscapePromptInput,
): string {
  switch (taskType) {
    case "campaign_map": {
      const ctx = input as CampaignMapPromptInput;
      const regions =
        ctx.regions?.map((r) => `${r.name}: ${r.description}`).join("; ") ?? "";
      return `${STYLE_PREFIX} Top-down fantasy world map for "${ctx.title}". ${
        ctx.premise ?? ""
      } Tone: ${ctx.tone ?? "adventurous"}. Genre: ${ctx.genre ?? "fantasy"}. Regions: ${regions}. Show continents, coastlines, forests, mountains, and seas as a single illustrated map.`;
    }
    case "location_landscape": {
      const ctx = input as LandscapePromptInput;
      return `${STYLE_PREFIX} Wide landscape view of ${ctx.locationName}. ${
        ctx.description ?? ""
      } Time: ${ctx.timeOfDay ?? "day"}. Mood: ${ctx.tone ?? "atmospheric"}.`;
    }
    case "character_portrait":
    case "npc_portrait": {
      const ctx = input as PortraitPromptInput;
      return `${STYLE_PREFIX} Character portrait bust of ${ctx.name}${
        ctx.role ? `, ${ctx.role}` : ""
      }. ${ctx.description ?? ""} Mood: ${ctx.tone ?? "neutral"}. Plain background.`;
    }
    default:
      return STYLE_PREFIX;
  }
}
