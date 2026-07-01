import type { Server as SocketIOServer } from "socket.io";
import {
  RealtimeRooms,
  type RealtimeRoom,
  type ServerEventName,
  type ServerToClientEvents,
} from "@tbrpg/shared";
import type { BroadcastOptions, ConnectionContext, RealtimeGateway } from "./gateway";
import { PresenceService } from "./presence";
import type Redis from "ioredis";

interface SocketMeta {
  playerId: string;
  campaignId?: string;
  partyId?: string;
  sceneId?: string;
}

/**
 * Socket.IO adapter for RealtimeGateway.
 * Game state authority remains in PostgreSQL — this only transports events.
 */
export class SocketIoRealtimeGateway implements RealtimeGateway {
  private connectionRooms = new Map<string, Set<string>>();
  private presence: PresenceService;

  constructor(
    private io: SocketIOServer,
    redis: Redis,
    private getSocketMeta: (connectionId: string) => SocketMeta | undefined,
  ) {
    this.presence = new PresenceService(redis);
  }

  async registerConnection(ctx: ConnectionContext): Promise<void> {
    this.connectionRooms.set(ctx.connectionId, new Set());
    if (ctx.campaignId) {
      await this.presence.setOnline(ctx.campaignId, {
        playerId: ctx.playerId,
        connectionId: ctx.connectionId,
        sceneId: ctx.sceneId,
        partyId: ctx.partyId,
      });
    }
  }

  async unregisterConnection(connectionId: string): Promise<void> {
    const meta = this.getSocketMeta(connectionId);
    if (meta?.campaignId) {
      await this.presence.removeConnection(meta.campaignId, connectionId, meta.playerId);
      await this.broadcast(
        RealtimeRooms.campaign(meta.campaignId),
        "presence:update",
        await this.presence.getCampaignPresence(meta.campaignId),
      );
    }
    this.connectionRooms.delete(connectionId);
  }

  async joinRoom(connectionId: string, room: RealtimeRoom): Promise<void> {
    const socket = this.io.sockets.sockets.get(connectionId);
    if (!socket) return;
    await socket.join(room);
    this.connectionRooms.get(connectionId)?.add(room);
  }

  async leaveRoom(connectionId: string, room: RealtimeRoom): Promise<void> {
    const socket = this.io.sockets.sockets.get(connectionId);
    if (!socket) return;
    await socket.leave(room);
    this.connectionRooms.get(connectionId)?.delete(room);
  }

  async broadcast<E extends ServerEventName>(
    room: RealtimeRoom,
    event: E,
    payload: ServerToClientEvents[E],
    options?: BroadcastOptions,
  ): Promise<void> {
    if (options?.excludeConnectionId) {
      this.io.to(room).except(options.excludeConnectionId).emit(event, payload);
    } else {
      this.io.to(room).emit(event, payload);
    }
  }

  async sendToConnection<E extends ServerEventName>(
    connectionId: string,
    event: E,
    payload: ServerToClientEvents[E],
  ): Promise<void> {
    this.io.to(connectionId).emit(event, payload);
  }

  async sendToPlayer<E extends ServerEventName>(
    playerId: string,
    event: E,
    payload: ServerToClientEvents[E],
  ): Promise<void> {
    await this.broadcast(RealtimeRooms.player(playerId), event, payload);
  }

  async getPlayerConnections(playerId: string): Promise<string[]> {
    const room = RealtimeRooms.player(playerId);
    const sockets = await this.io.in(room).fetchSockets();
    return sockets.map((s) => s.id);
  }

  getPresenceService() {
    return this.presence;
  }
}
