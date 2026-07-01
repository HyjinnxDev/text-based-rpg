import type { RealtimeRoom, ServerEventName, ServerToClientEvents } from "@tbrpg/shared";

export interface ConnectionContext {
  connectionId: string;
  playerId: string;
  campaignId?: string;
  partyId?: string;
  sceneId?: string;
}

export interface BroadcastOptions {
  /** Exclude a specific connection (e.g. sender echo suppression) */
  excludeConnectionId?: string;
}

/**
 * Provider-neutral realtime transport.
 * Socket.IO is one adapter; WebSockets/WebTransport/managed providers
 * can implement this without touching domain or DB layers.
 */
export interface RealtimeGateway {
  /** Join a logical room for a connection */
  joinRoom(connectionId: string, room: RealtimeRoom): Promise<void>;

  /** Leave a logical room */
  leaveRoom(connectionId: string, room: RealtimeRoom): Promise<void>;

  /** Broadcast a typed server event to all connections in a room */
  broadcast<E extends ServerEventName>(
    room: RealtimeRoom,
    event: E,
    payload: ServerToClientEvents[E],
    options?: BroadcastOptions,
  ): Promise<void>;

  /** Send a typed event to a single connection */
  sendToConnection<E extends ServerEventName>(
    connectionId: string,
    event: E,
    payload: ServerToClientEvents[E],
  ): Promise<void>;

  /** Send a typed event to a player's personal room (player:{id}) */
  sendToPlayer<E extends ServerEventName>(
    playerId: string,
    event: E,
    payload: ServerToClientEvents[E],
  ): Promise<void>;

  /** Track connection metadata for presence */
  registerConnection(ctx: ConnectionContext): Promise<void>;

  /** Remove connection from presence */
  unregisterConnection(connectionId: string): Promise<void>;

  /** Resolve connection IDs for a player (may be multiple tabs) */
  getPlayerConnections(playerId: string): Promise<string[]>;
}

export interface RealtimeGatewayFactory {
  create(): RealtimeGateway;
}
