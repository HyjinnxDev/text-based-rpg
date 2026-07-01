import { z } from "zod";
import { mapPositionSchema, worldTimeSchema, visibilitySchema } from "./schemas";

// ---------------------------------------------------------------------------
// Room naming conventions
// ---------------------------------------------------------------------------

export const RealtimeRooms = {
  campaign: (campaignId: string) => `campaign:${campaignId}`,
  party: (partyId: string) => `party:${partyId}`,
  scene: (sceneId: string) => `scene:${sceneId}`,
  privateScene: (sceneId: string) => `private-scene:${sceneId}`,
  player: (playerId: string) => `player:${playerId}`,
  host: (campaignId: string) => `host:${campaignId}`,
} as const;

export type RealtimeRoom =
  | ReturnType<(typeof RealtimeRooms)[keyof typeof RealtimeRooms]>;

// ---------------------------------------------------------------------------
// Client → Server events
// ---------------------------------------------------------------------------

export const presenceJoinSchema = z.object({
  campaignId: z.string().cuid(),
  partyId: z.string().cuid().optional(),
  sceneId: z.string().cuid().optional(),
});

export const presenceLeaveSchema = z.object({
  campaignId: z.string().cuid(),
});

export const actionSubmitSchema = z.object({
  campaignId: z.string().cuid(),
  sceneId: z.string().cuid().optional(),
  intent: z.string().min(1).max(4000),
  clientRequestId: z.string().uuid(),
});

export const chatSendSchema = z.object({
  campaignId: z.string().cuid(),
  sceneId: z.string().cuid().optional(),
  channel: z.enum(["party", "ic", "private", "campaign"]),
  targetPlayerId: z.string().cuid().optional(),
  message: z.string().min(1).max(2000),
});

export const catchUpRequestSchema = z.object({
  campaignId: z.string().cuid(),
  lastEventSequence: z.number().int().min(0).optional(),
});

export const mapTokenMoveSchema = z.object({
  campaignId: z.string().cuid(),
  markerId: z.string().cuid(),
  position: mapPositionSchema,
  /** Intent only — not authoritative until domain confirms travel */
  clientRequestId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Server → Client events
// ---------------------------------------------------------------------------

export const presenceStateSchema = z.object({
  campaignId: z.string(),
  players: z.array(
    z.object({
      playerId: z.string(),
      displayName: z.string().optional(),
      status: z.enum(["online", "away", "offline"]),
      sceneId: z.string().optional(),
      partyId: z.string().optional(),
    }),
  ),
});

export const actionStatusSchema = z.object({
  clientRequestId: z.string().uuid(),
  pendingActionId: z.string(),
  status: z.enum([
    "received",
    "validating",
    "queued",
    "processing",
    "completed",
    "failed",
  ]),
  message: z.string().optional(),
});

export const mapMarkerBroadcastSchema = z.object({
  id: z.string(),
  label: z.string(),
  markerType: z.string(),
  position: mapPositionSchema,
  entityId: z.string().optional(),
});

export const codexBroadcastSchema = z.object({
  id: z.string(),
  slug: z.string(),
  category: z.string(),
  title: z.string(),
  content: z.record(z.unknown()),
});

export const actionResolvedSchema = z.object({
  clientRequestId: z.string().uuid(),
  pendingActionId: z.string(),
  campaignId: z.string(),
  sceneId: z.string().optional(),
  narration: z.string(),
  worldTime: worldTimeSchema,
  campaignEventSequence: z.number().int(),
  mapMarkers: z.array(mapMarkerBroadcastSchema),
  codexUpdates: z.array(codexBroadcastSchema),
  visibility: visibilitySchema,
});

export const campaignEventBroadcastSchema = z.object({
  campaignId: z.string(),
  sequence: z.number().int(),
  eventType: z.string(),
  actorUserId: z.string().nullable(),
  sceneId: z.string().nullable(),
  payload: z.record(z.unknown()),
  inWorldTime: z.record(z.unknown()).optional(),
  visibility: visibilitySchema,
});

export const catchUpStateSchema = z.object({
  campaignId: z.string(),
  worldTime: worldTimeSchema,
  recentEvents: z.array(campaignEventBroadcastSchema),
  presence: presenceStateSchema,
  mapMarkers: z.array(mapMarkerBroadcastSchema),
});

export const notificationSchema = z.object({
  type: z.enum([
    "scene_changed",
    "shared_discovery",
    "combat_round",
    "travel_arrival",
    "player_available",
    "turn_prompt",
  ]),
  campaignId: z.string(),
  title: z.string(),
  body: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export const turnPromptSchema = z.object({
  campaignId: z.string(),
  sceneId: z.string(),
  round: z.number().int(),
  prompt: z.string(),
  deadlineAt: z.string().datetime().optional(),
});

// ---------------------------------------------------------------------------
// Typed event maps (provider-neutral)
// ---------------------------------------------------------------------------

export interface ClientToServerEvents {
  "presence:join": z.infer<typeof presenceJoinSchema>;
  "presence:leave": z.infer<typeof presenceLeaveSchema>;
  "action:submit": z.infer<typeof actionSubmitSchema>;
  "chat:send": z.infer<typeof chatSendSchema>;
  "catch-up:request": z.infer<typeof catchUpRequestSchema>;
  "map:token-move-intent": z.infer<typeof mapTokenMoveSchema>;
}

export interface ServerToClientEvents {
  "presence:update": z.infer<typeof presenceStateSchema>;
  "action:status": z.infer<typeof actionStatusSchema>;
  "action:resolved": z.infer<typeof actionResolvedSchema>;
  "campaign:event": z.infer<typeof campaignEventBroadcastSchema>;
  "map:token-moved": z.infer<typeof mapMarkerBroadcastSchema>;
  "catch-up:state": z.infer<typeof catchUpStateSchema>;
  "notification": z.infer<typeof notificationSchema>;
  "turn:prompt": z.infer<typeof turnPromptSchema>;
  "chat:message": {
    campaignId: string;
    sceneId?: string;
    channel: string;
    senderId: string;
    senderName: string;
    message: string;
    sentAt: string;
  };
  "error": { code: string; message: string };
}

export type ClientEventName = keyof ClientToServerEvents;
export type ServerEventName = keyof ServerToClientEvents;

export type ClientEventPayload<E extends ClientEventName> = ClientToServerEvents[E];
export type ServerEventPayload<E extends ServerEventName> = ServerToClientEvents[E];

// Redis fan-out envelope (cross-instance broadcast)
export const realtimeFanoutEnvelopeSchema = z.object({
  rooms: z.array(z.string()),
  event: z.string(),
  payload: z.unknown(),
  excludeConnectionId: z.string().optional(),
});

export type RealtimeFanoutEnvelope = z.infer<typeof realtimeFanoutEnvelopeSchema>;
