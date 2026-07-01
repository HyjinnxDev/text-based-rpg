import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const actionQueue = new Queue("tbrpg-actions", { connection });

export async function enqueueActionResolution(pendingActionId: string) {
  await actionQueue.add(
    "resolve-action",
    { pendingActionId },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  );
}
