"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Textarea,
  Badge,
  Spinner,
} from "@/components/ui";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_STEPS = [
  { key: "received", label: "Sent" },
  { key: "queued", label: "Queued" },
  { key: "processing", label: "Resolving" },
] as const;

function ActionProgress({ status }: { status: string }) {
  const currentIndex = ACTION_STEPS.findIndex((s) => s.key === status);

  return (
    <div
      className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5"
      role="status"
      aria-live="polite"
    >
      <p className="mb-2 text-xs font-medium text-primary">Resolving your action…</p>
      <ol className="flex items-center gap-1">
        {ACTION_STEPS.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;

          return (
            <li key={step.key} className="flex flex-1 items-center gap-1">
              <div
                className={cn(
                  "flex items-center gap-1.5 text-xs",
                  done && "text-emerald-400",
                  active && "font-medium text-primary",
                  !done && !active && "text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : active ? (
                  <Spinner size="sm" className="shrink-0" />
                ) : (
                  <Circle className="h-3 w-3 shrink-0 opacity-40" aria-hidden />
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {i < ACTION_STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-px flex-1",
                    done ? "bg-emerald-400/40" : "bg-border",
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ScenePanel({
  connected,
  connecting,
  realtimeEnabled,
  actionStatus,
  actionError,
  narration,
  onSubmit,
  compact,
}: {
  connected: boolean;
  connecting?: boolean;
  realtimeEnabled: boolean;
  actionStatus: string | null;
  actionError?: string | null;
  narration: string;
  onSubmit: (action: string) => void;
  compact?: boolean;
}) {
  const [action, setAction] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loading =
    actionStatus === "received" ||
    actionStatus === "queued" ||
    actionStatus === "processing";

  // Put the cursor back in the composer once the action resolves (or fails)
  // so the player can keep typing without reaching for the mouse.
  const prevLoadingRef = useRef(loading);
  useEffect(() => {
    if (prevLoadingRef.current && !loading) {
      textareaRef.current?.focus();
    }
    prevLoadingRef.current = loading;
  }, [loading]);

  function handleSubmit() {
    const trimmed = action.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
    setAction("");
  }

  function connectionBadge() {
    if (connecting) {
      return (
        <Badge variant="warning" className="gap-1">
          <Spinner size="sm" />
          Connecting
        </Badge>
      );
    }
    return (
      <Badge variant={connected ? "success" : "muted"}>
        {connected ? (realtimeEnabled ? "Live" : "REST") : "Offline"}
      </Badge>
    );
  }

  return (
    <Card className={`flex flex-col gap-4 ${compact ? "border-0 bg-transparent p-0 shadow-none" : ""}`}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Scene</CardTitle>
        {connectionBadge()}
      </CardHeader>

      <div
        className={cn(
          "scrollbar-thin overflow-y-auto rounded-lg border border-border/50 bg-muted/40 p-4 transition-opacity",
          compact ? "min-h-[40dvh] max-h-[50dvh]" : "min-h-[140px] max-h-[320px] sm:max-h-[400px]",
          loading && "opacity-60",
        )}
      >
        {loading && !narration ? (
          <div className="space-y-2" aria-hidden>
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 sm:text-base sm:leading-loose">
            {narration || "The story begins here. Describe what you do."}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {actionStatus && loading && <ActionProgress status={actionStatus} />}

        {actionError && !loading && (
          <p
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {actionError}
          </p>
        )}

        <Textarea
          ref={textareaRef}
          rows={compact ? 3 : 4}
          placeholder={loading ? "Waiting for the world to respond…" : "What do you do?"}
          value={action}
          onChange={(e) => setAction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={loading || connecting}
          aria-label="Your action"
        />

        {!connected && !connecting && realtimeEnabled && (
          <p className="text-xs text-muted-foreground sm:text-sm">
            Start the realtime service or deploy to Railway for live multiplayer.
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            onClick={handleSubmit}
            disabled={loading || connecting || !connected || !action.trim()}
            loading={loading}
            className="w-full sm:w-auto"
            size="lg"
          >
            {loading ? "Resolving…" : "Take action"}
          </Button>
          <p className="hidden text-xs text-muted-foreground sm:block">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-sans">Enter</kbd>{" "}
            to send ·{" "}
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-sans">
              Shift+Enter
            </kbd>{" "}
            for a new line
          </p>
        </div>
      </div>
    </Card>
  );
}
