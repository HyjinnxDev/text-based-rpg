import type { Server, Socket } from "socket.io";
import {
  actionSubmitSchema,
  catchUpRequestSchema,
  chatSendSchema,
  presenceJoinSchema,
  presenceLeaveSchema,
  RealtimeRooms,
  type ServerEventName,
  type ServerToClientEvents,
} from "@tbrpg/shared";
import {
  submitActionIntent,
  buildCatchUpState,
} from "@tbrpg/domain";
import type { SocketIoRealtimeGateway } from "@tbrpg/realtime";
import { RealtimeFanout } from "@tbrpg/realtime";
import type { AuthenticatedUser } from "./auth";
import { enqueueActionResolution } from "./queue";

interface SocketData {
  user: AuthenticatedUser;
  campaignId?: string;
  partyId?: string;
  sceneId?: string;
}

export function registerHandlers(
  io: Server,
  gateway: SocketIoRealtimeGateway,
  fanout: RealtimeFanout,
) {
  const getMeta = (socketId: string) => {
    const socket = io.sockets.sockets.get(socketId) as Socket | undefined;
    if (!socket?.data?.user) return undefined;
    const data = socket.data as SocketData;
    return {
      playerId: data.user.userId,
      campaignId: data.campaignId,
      partyId: data.partyId,
      sceneId: data.sceneId,
    };
  };

  io.on("connection", (socket: Socket) => {
    const user = (socket.data as SocketData).user;
    if (!user) {
      socket.emit("error", { code: "UNAUTHORIZED", message: "Not authenticated" });
      socket.disconnect();
      return;
    }

    gateway.registerConnection({
      connectionId: socket.id,
      playerId: user.userId,
    });

    gateway.joinRoom(socket.id, RealtimeRooms.player(user.userId));

    socket.on("presence:join", async (raw) => {
      try {
        const payload = presenceJoinSchema.parse(raw);
        const data = socket.data as SocketData;
        data.campaignId = payload.campaignId;
        data.partyId = payload.partyId;
        data.sceneId = payload.sceneId;

        await gateway.joinRoom(socket.id, RealtimeRooms.campaign(payload.campaignId));
        await gateway.joinRoom(socket.id, RealtimeRooms.player(user.userId));

        if (payload.partyId) {
          await gateway.joinRoom(socket.id, RealtimeRooms.party(payload.partyId));
        }
        if (payload.sceneId) {
          const scene = await import("@tbrpg/db").then((m) =>
            m.prisma.scene.findUnique({ where: { id: payload.sceneId } }),
          );
          const room =
            scene?.scope === "PRIVATE" || scene?.scope === "EXCLUSIVE"
              ? RealtimeRooms.privateScene(payload.sceneId!)
              : RealtimeRooms.scene(payload.sceneId!);
          await gateway.joinRoom(socket.id, room);
        }

        await gateway.registerConnection({
          connectionId: socket.id,
          playerId: user.userId,
          campaignId: payload.campaignId,
          partyId: payload.partyId,
          sceneId: payload.sceneId,
        });

        const presence = await gateway
          .getPresenceService()
          .getCampaignPresence(payload.campaignId);

        await gateway.broadcast(
          RealtimeRooms.campaign(payload.campaignId),
          "presence:update",
          presence,
        );
      } catch (error) {
        socket.emit("error", {
          code: "PRESENCE_JOIN_FAILED",
          message: error instanceof Error ? error.message : "Failed to join",
        });
      }
    });

    socket.on("presence:leave", async (raw) => {
      try {
        const payload = presenceLeaveSchema.parse(raw);
        await gateway.unregisterConnection(socket.id);
        const presence = await gateway
          .getPresenceService()
          .getCampaignPresence(payload.campaignId);
        await gateway.broadcast(
          RealtimeRooms.campaign(payload.campaignId),
          "presence:update",
          presence,
        );
      } catch {
        // ignore
      }
    });

    socket.on("action:submit", async (raw) => {
      try {
        const payload = actionSubmitSchema.parse(raw);

        await gateway.sendToConnection(socket.id, "action:status", {
          clientRequestId: payload.clientRequestId,
          pendingActionId: "pending",
          status: "received",
        });

        const submitted = await submitActionIntent({
          campaignId: payload.campaignId,
          userId: user.userId,
          sceneId: payload.sceneId,
          intent: payload.intent,
          clientRequestId: payload.clientRequestId,
        });

        await gateway.sendToConnection(socket.id, "action:status", {
          clientRequestId: payload.clientRequestId,
          pendingActionId: submitted.pendingActionId,
          status: "queued",
        });

        const inline = process.env.REALTIME_INLINE_RESOLVE === "true";
        if (inline) {
          const { resolveActionIntent } = await import("@tbrpg/domain");
          const { createAiRouterFromEnv } = await import("@tbrpg/ai");
          const { publishConfirmedAction } = await import("./broadcast");

          await gateway.sendToConnection(socket.id, "action:status", {
            clientRequestId: payload.clientRequestId,
            pendingActionId: submitted.pendingActionId,
            status: "processing",
          });

          const result = await resolveActionIntent(
            submitted.pendingActionId,
            createAiRouterFromEnv(),
          );
          await publishConfirmedAction(fanout, gateway, result);
        } else {
          await enqueueActionResolution(submitted.pendingActionId);
        }
      } catch (error) {
        socket.emit("error", {
          code: "ACTION_SUBMIT_FAILED",
          message: error instanceof Error ? error.message : "Action failed",
        });
      }
    });

    socket.on("catch-up:request", async (raw) => {
      try {
        const payload = catchUpRequestSchema.parse(raw);
        const state = await buildCatchUpState(
          payload.campaignId,
          user.userId,
          payload.lastEventSequence,
        );
        await gateway.sendToConnection(socket.id, "catch-up:state", state);
      } catch (error) {
        socket.emit("error", {
          code: "CATCHUP_FAILED",
          message: error instanceof Error ? error.message : "Catch-up failed",
        });
      }
    });

    socket.on("chat:send", async (raw) => {
      try {
        const payload = chatSendSchema.parse(raw);
        const message = {
          campaignId: payload.campaignId,
          sceneId: payload.sceneId,
          channel: payload.channel,
          senderId: user.userId,
          senderName: user.name,
          message: payload.message,
          sentAt: new Date().toISOString(),
        };

        const room =
          payload.channel === "private" && payload.targetPlayerId
            ? RealtimeRooms.player(payload.targetPlayerId)
            : payload.sceneId
              ? RealtimeRooms.scene(payload.sceneId)
              : RealtimeRooms.campaign(payload.campaignId);

        await gateway.broadcast(room, "chat:message", message);
      } catch (error) {
        socket.emit("error", {
          code: "CHAT_FAILED",
          message: error instanceof Error ? error.message : "Chat failed",
        });
      }
    });

    socket.on("disconnect", async () => {
      const meta = getMeta(socket.id);
      socketMeta.delete(socket.id);
      if (meta?.campaignId) {
        await gateway.unregisterConnection(socket.id);
      }
    });
  });
}

export async function handleFanoutMessage(
  gateway: SocketIoRealtimeGateway,
  envelope: {
    rooms: string[];
    event: string;
    payload: unknown;
    excludeConnectionId?: string;
  },
) {
  for (const room of envelope.rooms) {
    await gateway.broadcast(
      room as Parameters<typeof gateway.broadcast>[0],
      envelope.event as ServerEventName,
      envelope.payload as ServerToClientEvents[ServerEventName],
      { excludeConnectionId: envelope.excludeConnectionId },
    );
  }
}
