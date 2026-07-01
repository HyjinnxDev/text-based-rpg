import type { ConfirmedActionResult } from "@tbrpg/domain";
import type { SocketIoRealtimeGateway } from "@tbrpg/realtime";
import { RealtimeFanout } from "@tbrpg/realtime";

/** Broadcast confirmed action results — only after DB transaction commits */
export async function publishConfirmedAction(
  fanout: RealtimeFanout,
  gateway: SocketIoRealtimeGateway,
  result: ConfirmedActionResult,
) {
  const resolved = {
    clientRequestId: result.clientRequestId,
    pendingActionId: result.pendingActionId,
    campaignId: result.campaignId,
    sceneId: result.sceneId,
    narration: result.narration,
    worldTime: result.worldTime as {
      day: number;
      hour: number;
      season: string;
      calendarLabel: string;
    },
    campaignEventSequence: result.campaignEventSequence,
    mapMarkers: result.mapMarkers,
    codexUpdates: result.codexUpdates,
    visibility: result.broadcast.visibility,
  };

  const campaignEvent = {
    campaignId: result.campaignId,
    sequence: result.campaignEventSequence,
    eventType: "state.applied",
    actorUserId: null,
    sceneId: result.sceneId ?? null,
    payload: { narration: result.narration },
    visibility: result.broadcast.visibility,
  };

  const envelope = {
    rooms: result.broadcast.rooms,
    event: "action:resolved",
    payload: resolved,
  };

  // Local broadcast + cross-instance fan-out
  await handleLocalBroadcast(gateway, envelope);
  await fanout.publish(envelope);

  const eventEnvelope = {
    rooms: result.broadcast.rooms,
    event: "campaign:event",
    payload: campaignEvent,
  };
  await handleLocalBroadcast(gateway, eventEnvelope);
  await fanout.publish(eventEnvelope);

  for (const marker of result.mapMarkers) {
    const markerEnvelope = {
      rooms: result.broadcast.rooms,
      event: "map:token-moved",
      payload: marker,
    };
    await handleLocalBroadcast(gateway, markerEnvelope);
    await fanout.publish(markerEnvelope);
  }
}

async function handleLocalBroadcast(
  gateway: SocketIoRealtimeGateway,
  envelope: { rooms: string[]; event: string; payload: unknown },
) {
  const { handleFanoutMessage } = await import("./handlers");
  await handleFanoutMessage(gateway, envelope);
}
