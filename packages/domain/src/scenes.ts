import { resolveActionIntent, submitActionIntent } from "./action-resolver";

/** @deprecated Use submitActionIntent + resolveActionIntent via realtime/worker */
export async function resolvePlayerAction(
  campaignId: string,
  userId: string,
  action: string,
  sceneId?: string,
  ai?: import("@tbrpg/ai").AiRouter,
) {
  if (!ai) throw new Error("AI router required");

  const { randomUUID } = await import("crypto");
  const clientRequestId = randomUUID();

  const submitted = await submitActionIntent({
    campaignId,
    userId,
    sceneId,
    intent: action,
    clientRequestId,
  });

  const result = await resolveActionIntent(submitted.pendingActionId, ai);

  return {
    narration: result.narration,
    worldTime: result.worldTime,
    mapMarkers: result.mapMarkers,
    codexUpdates: result.codexUpdates,
    eventProvider: "mock",
  };
}

export { getSceneState } from "./scene-queries";
