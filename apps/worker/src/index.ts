import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { resolveActionIntent } from "@tbrpg/domain";
import { createAiRouterFromEnv } from "@tbrpg/ai";
import { RealtimeFanout } from "@tbrpg/realtime";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const fanout = new RealtimeFanout(connection, () => {
  // Worker only publishes; realtime instances subscribe
});

const ai = createAiRouterFromEnv();

const worker = new Worker(
  "tbrpg-actions",
  async (job) => {
    if (job.name === "resolve-action") {
      const { pendingActionId } = job.data as { pendingActionId: string };

      const result = await resolveActionIntent(pendingActionId, ai);

      const resolved = {
        clientRequestId: result.clientRequestId,
        pendingActionId: result.pendingActionId,
        campaignId: result.campaignId,
        sceneId: result.sceneId,
        narration: result.narration,
        worldTime: result.worldTime,
        campaignEventSequence: result.campaignEventSequence,
        mapMarkers: result.mapMarkers,
        codexUpdates: result.codexUpdates,
        visibility: result.broadcast.visibility,
      };

      await fanout.publish({
        rooms: result.broadcast.rooms,
        event: "action:status",
        payload: {
          clientRequestId: result.clientRequestId,
          pendingActionId: result.pendingActionId,
          status: "completed" as const,
        },
      });

      await fanout.publish({
        rooms: result.broadcast.rooms,
        event: "action:resolved",
        payload: resolved,
      });

      await fanout.publish({
        rooms: result.broadcast.rooms,
        event: "campaign:event",
        payload: {
          campaignId: result.campaignId,
          sequence: result.campaignEventSequence,
          eventType: "state.applied",
          actorUserId: null,
          sceneId: result.sceneId ?? null,
          payload: { narration: result.narration },
          visibility: result.broadcast.visibility,
        },
      });

      for (const marker of result.mapMarkers) {
        await fanout.publish({
          rooms: result.broadcast.rooms,
          event: "map:token-moved",
          payload: marker,
        });
      }

      return { ok: true, pendingActionId };
    }

    console.log(`[worker] unhandled job: ${job.name}`);
    return { ok: false };
  },
  { connection, concurrency: 4 },
);

worker.on("ready", () => {
  console.log("[worker] Action resolution worker ready (queue: tbrpg-actions)");
});

worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

process.on("SIGINT", async () => {
  await worker.close();
  await connection.quit();
  process.exit(0);
});
