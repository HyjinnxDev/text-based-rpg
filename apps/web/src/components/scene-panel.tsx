"use client";

import { Button, Card, Textarea } from "@/components/ui";

export function ScenePanel({
  connected,
  realtimeEnabled,
  actionStatus,
  narration,
  onNarrationChange,
  onSubmit,
}: {
  connected: boolean;
  realtimeEnabled: boolean;
  actionStatus: string | null;
  narration: string;
  onNarrationChange: (value: string) => void;
  onSubmit: (action: string) => void;
}) {
  const loading =
    actionStatus === "received" ||
    actionStatus === "queued" ||
    actionStatus === "processing";

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-100">Scene</h2>
        <span
          className={`text-xs ${connected ? "text-emerald-400" : "text-stone-500"}`}
        >
          {connected ? (realtimeEnabled ? "Live" : "REST") : "Offline"}
        </span>
      </div>

      <p className="min-h-[120px] whitespace-pre-wrap text-sm leading-relaxed text-stone-300">
        {narration || "The story begins here. Describe what you do."}
      </p>

      <Textarea
        rows={4}
        placeholder="What do you do? (freeform)"
        defaultValue=""
        key={actionStatus === "completed" ? "reset" : "active"}
        onChange={(e) => onNarrationChange(e.target.value)}
        disabled={loading}
        id="scene-action-input"
      />

      {!connected && realtimeEnabled && (
        <p className="text-sm text-stone-500">
          Start the realtime service or deploy to Railway for live multiplayer.
        </p>
      )}
      {actionStatus && loading && (
        <p className="text-sm text-amber-400">Resolving action ({actionStatus})...</p>
      )}

      <Button
        onClick={() => {
          const el = document.getElementById("scene-action-input") as HTMLTextAreaElement;
          if (el?.value.trim()) {
            onSubmit(el.value.trim());
            el.value = "";
          }
        }}
        disabled={loading || !connected}
      >
        {loading ? "Resolving..." : "Take action"}
      </Button>
    </Card>
  );
}
