import type { SceneScope } from "@tbrpg/db";
import {
  RealtimeRooms,
  type RealtimeRoom,
  type visibilitySchema,
} from "@tbrpg/shared";
import type { z } from "zod";

type Visibility = z.infer<typeof visibilitySchema>;

export interface BroadcastPlan {
  rooms: RealtimeRoom[];
  visibility: Visibility;
}

/** Compute which realtime rooms may receive a confirmed event */
export function planBroadcast(
  input: {
    campaignId: string;
    sceneId?: string;
    sceneScope?: SceneScope;
    partyId?: string;
    actorUserId: string;
    visibility?: Visibility;
  },
): BroadcastPlan {
  const visibility: Visibility =
    input.visibility ?? (input.sceneScope ? sceneScopeToVisibility(input.sceneScope) : { scope: "party" });
  const rooms: RealtimeRoom[] = [
    RealtimeRooms.campaign(input.campaignId),
  ];

  switch (visibility.scope) {
    case "public":
      if (input.sceneId) rooms.push(RealtimeRooms.scene(input.sceneId));
      break;
    case "party":
      if (input.partyId) rooms.push(RealtimeRooms.party(input.partyId));
      if (input.sceneId) rooms.push(RealtimeRooms.scene(input.sceneId));
      break;
    case "private":
    case "secret":
      if (input.sceneId) rooms.push(RealtimeRooms.privateScene(input.sceneId));
      rooms.push(RealtimeRooms.player(input.actorUserId));
      break;
    default:
      if (input.sceneId) rooms.push(RealtimeRooms.scene(input.sceneId));
  }

  return { rooms: [...new Set(rooms)], visibility };
}

export function sceneScopeToVisibility(scope: SceneScope): Visibility {
  switch (scope) {
    case "PUBLIC":
      return { scope: "public" };
    case "PARTY":
      return { scope: "party" };
    case "PRIVATE":
    case "EXCLUSIVE":
    case "INSTANCED":
      return { scope: "private" };
    default:
      return { scope: "party" };
  }
}
