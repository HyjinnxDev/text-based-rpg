import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedisOptional(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return redis;
}

export function getRedis(): Redis {
  const client = getRedisOptional();
  if (!client) {
    throw new Error("REDIS_URL is required for realtime multiplayer");
  }
  return client;
}

export async function withCampaignLock<T>(
  campaignId: string,
  fn: () => Promise<T>,
  ttlMs = 15000,
): Promise<T> {
  const client = getRedisOptional();
  if (!client) return fn();

  const key = `lock:campaign:${campaignId}`;
  const token = `${Date.now()}-${Math.random()}`;
  const acquired = await client.set(key, token, "PX", ttlMs, "NX");
  if (acquired !== "OK") {
    throw new Error("Campaign is busy processing another action");
  }

  try {
    return await fn();
  } finally {
    const current = await client.get(key);
    if (current === token) await client.del(key);
  }
}

const RESERVATION_TTL_SEC = 30;

/** Temporary action reservation to prevent duplicate/conflicting intents */
export async function reserveActionSlot(
  campaignId: string,
  userId: string,
  clientRequestId: string,
): Promise<boolean> {
  const client = getRedisOptional();
  if (!client) return true;

  const key = `reservation:action:${campaignId}:${userId}`;
  const existing = await client.get(key);
  if (existing && existing !== clientRequestId) return false;

  await client.set(key, clientRequestId, "EX", RESERVATION_TTL_SEC);
  return (await client.get(key)) === clientRequestId;
}

export async function releaseActionReservation(campaignId: string, userId: string) {
  const client = getRedisOptional();
  if (!client) return;
  await client.del(`reservation:action:${campaignId}:${userId}`);
}
