import { io, type Socket } from "socket.io-client";
import type {
  ClientEventName,
  ClientEventPayload,
  ClientToServerEvents,
  ServerEventName,
  ServerEventPayload,
  ServerToClientEvents,
} from "@tbrpg/shared";

type EventHandler<E extends ServerEventName> = (
  payload: ServerEventPayload<E>,
) => void;

/**
 * Typed browser client — the only realtime entry point for the frontend.
 * No direct Socket.IO usage outside this module.
 */
export class RealtimeClient {
  private socket: ReturnType<typeof io> | null = null;
  private handlers = new Map<string, Set<EventHandler<ServerEventName>>>();

  constructor(private url: string) {}

  connect(authToken: string) {
    if (this.socket?.connected) return;

    this.socket = io(this.url, {
      auth: { token: authToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      // connection established
    });

    this.socket.on("disconnect", () => {
      // connection lost — catch-up runs on reconnect via presence:join
    });

    const serverEvents: ServerEventName[] = [
      "presence:update",
      "action:status",
      "action:resolved",
      "campaign:event",
      "map:token-moved",
      "catch-up:state",
      "notification",
      "turn:prompt",
      "chat:message",
      "error",
    ];

    for (const event of serverEvents) {
      this.socket.on(event, (payload: ServerToClientEvents[typeof event]) => {
        this.dispatch(event, payload);
      });
    }
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  /** Emit a typed client event */
  send<E extends ClientEventName>(event: E, payload: ClientEventPayload<E>) {
    if (!this.socket?.connected) {
      throw new Error("Realtime not connected");
    }
    this.socket.emit(event, payload);
  }

  /** Subscribe to a typed server event */
  on<E extends ServerEventName>(event: E, handler: EventHandler<E>) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<ServerEventName>);
    return () => this.off(event, handler);
  }

  off<E extends ServerEventName>(event: E, handler: EventHandler<E>) {
    this.handlers.get(event)?.delete(handler as EventHandler<ServerEventName>);
  }

  get connected() {
    return this.socket?.connected ?? false;
  }

  private dispatch<E extends ServerEventName>(event: E, payload: ServerEventPayload<E>) {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      handler(payload);
    }
  }
}

let singleton: RealtimeClient | null = null;

export function getRealtimeClient(): RealtimeClient {
  if (!singleton) {
    const url = process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:3001";
    singleton = new RealtimeClient(url);
  }
  return singleton;
}
