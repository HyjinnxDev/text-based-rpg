"use client";

import { useState } from "react";
import { Button, Card, CardHeader, CardTitle, Textarea, Badge } from "@/components/ui";
import { Loader2 } from "lucide-react";

export function ScenePanel({
  connected,
  realtimeEnabled,
  actionStatus,
  narration,
  onNarrationChange,
  onSubmit,
  compact,
}: {
  connected: boolean;
  realtimeEnabled: boolean;
  actionStatus: string | null;
  narration: string;
  onNarrationChange: (value: string) => void;
  onSubmit: (action: string) => void;
  compact?: boolean;
}) {
  const [action, setAction] = useState("");
  const loading =
    actionStatus === "received" ||
    actionStatus === "queued" ||
    actionStatus === "processing";

  function handleSubmit() {
    const trimmed = action.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setAction("");
  }

  return (
    <Card className={`flex flex-col gap-4 ${compact ? "border-0 bg-transparent p-0 shadow-none" : ""}`}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Scene</CardTitle>
        <Badge variant={connected ? "success" : "muted"}>
          {connected ? (realtimeEnabled ? "Live" : "REST") : "Offline"}
        </Badge>
      </CardHeader>

      <div
        className={`scrollbar-thin overflow-y-auto rounded-lg border border-border/50 bg-muted/40 p-4 ${
          compact ? "min-h-[40dvh] max-h-[50dvh]" : "min-h-[140px] max-h-[320px] sm:max-h-[400px]"
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 sm:text-base sm:leading-loose">
          {narration || "The story begins here. Describe what you do."}
        </p>
      </div>

      <div className="space-y-3">
        <Textarea
          rows={compact ? 3 : 4}
          placeholder="What do you do?"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            onNarrationChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={loading}
          aria-label="Your action"
        />

        {!connected && realtimeEnabled && (
          <p className="text-xs text-muted-foreground sm:text-sm">
            Start the realtime service or deploy to Railway for live multiplayer.
          </p>
        )}
        {actionStatus && loading && (
          <p className="flex items-center gap-2 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Resolving action ({actionStatus})…
          </p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={loading || !connected || !action.trim()}
          className="w-full sm:w-auto"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Resolving…
            </>
          ) : (
            "Take action"
          )}
        </Button>
      </div>
    </Card>
  );
}
