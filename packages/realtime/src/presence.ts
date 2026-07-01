import type Redis from "ioredis";
import { RealtimeRooms, presenceStateSchema, type RealtimeRoom } from "@tbrpg/shared";

const PRESENCE_TTL_SEC = 120;

function presenceKey(campaignId: string) {
  return `presence:campaign:${campaignId}`;
}

export interface PresenceEntry {
  playerId: string;
  displayName?: string;
  status: "online" | "away" | "offline";
  sceneId?: string;
  partyId?: string;
  connectionId: string;
  updatedAt: string;
}

export class PresenceService {
  constructor(private redis: Redis) {}

  async setOnline(
    campaignId: string,
    entry: Omit<PresenceEntry, "status" | "updatedAt">,
  ) {
    const record: PresenceEntry = {
      ...entry,
      status: "online",
      updatedAt: new Date().toISOString(),
    };
    await this.redis.hset(presenceKey(campaignId), entry.connectionId, JSON.stringify(record));
    await this.redis.expire(presenceKey(campaignId), PRESENCE_TTL_SEC);
    await this.redis.sadd(`presence:player:${entry.playerId}`, entry.connectionId);
  }

  async removeConnection(campaignId: string, connectionId: string, playerId: string) {
    await this.redis.hdel(presenceKey(campaignId), connectionId);
    await this.redis.srem(`presence:player:${playerId}`, connectionId);
  }

  async getCampaignPresence(campaignId: string) {
    const raw = await this.redis.hgetall(presenceKey(campaignId));
    const players = Object.values(raw).map((v) => JSON.parse(v) as PresenceEntry);
    return presenceStateSchema.parse({
      campaignId,
      players: players.map((p) => ({
        playerId: p.playerId,
        displayName: p.displayName,
        status: p.status,
        sceneId: p.sceneId,
        partyId: p.partyId,
      })),
    });
  }

  async refresh(campaignId: string, connectionId: string) {
    await this.redis.expire(presenceKey(campaignId), PRESENCE_TTL_SEC);
  }
}

export const REALTIME_FANOUT_CHANNEL = "tbrpg:realtime:fanout";

export class RealtimeFanout {
  constructor(
    private redis: Redis,
    private onMessage: (envelope: {
      rooms: RealtimeRoom[];
      event: string;
      payload: unknown;
      excludeConnectionId?: string;
    }) => void,
  ) {}

  async subscribe() {
    const sub = this.redis.duplicate();
    await sub.subscribe(REALTIME_FANOUT_CHANNEL);
    sub.on("message", (_channel, message) => {
      try {
        const envelope = JSON.parse(message);
        this.onMessage(envelope);
      } catch {
        // ignore malformed
      }
    });
    return sub;
  }

  async publish(envelope: {
    rooms: RealtimeRoom[];
    event: string;
    payload: unknown;
    excludeConnectionId?: string;
  }) {
    await this.redis.publish(REALTIME_FANOUT_CHANNEL, JSON.stringify(envelope));
  }
}

export { RealtimeRooms };
