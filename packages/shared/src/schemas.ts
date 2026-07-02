import { z } from "zod";

export const worldTimeSchema = z.object({
  day: z.number().int().min(1),
  hour: z.number().int().min(0).max(23),
  season: z.string(),
  calendarLabel: z.string(),
});

export const visibilitySchema = z.object({
  scope: z.enum(["public", "party", "private", "faction", "secret"]),
  userIds: z.array(z.string()).optional(),
});

export const mapPositionSchema = z.object({
  lng: z.number(),
  lat: z.number(),
});

// ---------------------------------------------------------------------------
// Campaign
// ---------------------------------------------------------------------------

export const createCampaignSchema = z.discriminatedUnion("generationMode", [
  z.object({
    generationMode: z.literal("rough_idea"),
    roughIdea: z.string().min(10).max(2000),
    title: z.string().min(1).max(200).optional(),
    tone: z.string().optional(),
    characterName: z.string().min(1).max(80).optional(),
    mode: z.enum(["SOLO", "PARTY", "SHARED_WORLD"]).default("SOLO"),
  }),
  z.object({
    generationMode: z.literal("random"),
    title: z.string().min(1).max(200).optional(),
    tone: z.string().optional(),
    genre: z.string().optional(),
    characterName: z.string().min(1).max(80).optional(),
    mode: z.enum(["SOLO", "PARTY", "SHARED_WORLD"]).default("SOLO"),
  }),
  z.object({
    generationMode: z.literal("custom"),
    title: z.string().min(1).max(200),
    premise: z.string().min(10).max(5000),
    tone: z.string(),
    genre: z.string(),
    setting: z.string().min(10),
    characterName: z.string().min(1).max(80).optional(),
    mode: z.enum(["SOLO", "PARTY", "SHARED_WORLD"]).default("SOLO"),
  }),
]);

export const submitActionSchema = z.object({
  action: z.string().min(1).max(4000),
  sceneId: z.string().cuid().optional(),
});

export const generatedCampaignSchema = z.object({
  title: z.string(),
  premise: z.string(),
  worldHistory: z.string(),
  currentSituation: z.string(),
  startingLocation: z.object({
    name: z.string(),
    description: z.string(),
    lng: z.number().default(0),
    lat: z.number().default(0),
  }),
  regions: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
      }),
    )
    .default([]),
  factions: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
      }),
    )
    .default([]),
  npcs: z
    .array(
      z.object({
        name: z.string(),
        role: z.string(),
        personality: z.string(),
        goals: z.string(),
      }),
    )
    .default([]),
  storyThreads: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
      }),
    )
    .default([]),
  rumours: z.array(z.string()).default([]),
});

// ---------------------------------------------------------------------------
// State delta (validated AI output for persistence)
// ---------------------------------------------------------------------------

export const stateDeltaSchema = z.object({
  narration: z.string().min(1),
  worldTime: worldTimeSchema.partial().optional(),
  characterUpdates: z
    .array(
      z.object({
        characterId: z.string(),
        stats: z.record(z.unknown()).optional(),
        locationId: z.string().nullable().optional(),
      }),
    )
    .default([]),
  npcUpdates: z
    .array(
      z.object({
        npcId: z.string(),
        locationId: z.string().nullable().optional(),
        mood: z.string().optional(),
        memoryEvent: z.string().optional(),
      }),
    )
    .default([]),
  inventoryChanges: z
    .array(
      z.object({
        itemId: z.string().optional(),
        name: z.string().optional(),
        quantityDelta: z.number().int(),
        ownerType: z.string(),
        ownerId: z.string(),
        category: z.string().optional(),
      }),
    )
    .default([]),
  questUpdates: z
    .array(
      z.object({
        questId: z.string().optional(),
        title: z.string().optional(),
        status: z.string().optional(),
        objectiveCompleted: z.string().optional(),
      }),
    )
    .default([]),
  codexUpdates: z
    .array(
      z.object({
        slug: z.string(),
        category: z.string(),
        title: z.string(),
        content: z.record(z.unknown()),
        visibility: visibilitySchema.optional(),
      }),
    )
    .default([]),
  playerKnowledge: z
    .array(
      z.object({
        knowledgeKey: z.string(),
        category: z.string(),
        content: z.record(z.unknown()),
        visibility: visibilitySchema.optional(),
      }),
    )
    .default([]),
  mapMarkerUpdates: z
    .array(
      z.object({
        markerId: z.string().optional(),
        markerType: z.string(),
        entityId: z.string().optional(),
        label: z.string(),
        position: mapPositionSchema,
        locationId: z.string().nullable().optional(),
      }),
    )
    .default([]),
  meaningful: z.boolean().default(true),
});

export type WorldTime = z.infer<typeof worldTimeSchema>;
export type StateDelta = z.infer<typeof stateDeltaSchema>;
export type GeneratedCampaign = z.infer<typeof generatedCampaignSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type SubmitActionInput = z.infer<typeof submitActionSchema>;
