"use client";

import { useEffect, useState } from "react";
import { Hourglass, Repeat } from "lucide-react";
import { Badge, Button } from "@/components/ui";

interface TurnState {
  viewerRole: "HOST" | "PLAYER" | "OBSERVER";
  turnMode: "free" | "rounds";
  round: number;
  waitingOn: Array<{ userId: string; name: string }>;
  youHaveActed: boolean;
}

export function TurnBar({
  campaignId,
  sceneId,
}: {
  campaignId: string;
  sceneId: string;
}) {
  const [state, setState] = useState<TurnState | null>(null);
  const [switching, setSwitching] = useState(false);

  async function load() {
    const res = await fetch(`/api/campaigns/${campaignId}/scenes/${sceneId}/turns`);
    if (res.ok) setState(await res.json());
  }

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("campaign-updated", handler);
    return () => window.removeEventListener("campaign-updated", handler);
  }, [campaignId, sceneId]);

  if (!state) return null;

  async function toggleMode() {
    if (!state) return;
    setSwitching(true);
    const res = await fetch(`/api/campaigns/${campaignId}/scenes/${sceneId}/turns`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: state.turnMode === "rounds" ? "free" : "rounds" }),
    });
    if (res.ok) setState(await res.json());
    setSwitching(false);
  }

  const isHost = state.viewerRole === "HOST";
  if (state.turnMode === "free" && !isHost) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
      {state.turnMode === "rounds" ? (
        <>
          <Badge variant="default">Round {state.round}</Badge>
          {state.youHaveActed ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Hourglass className="h-3.5 w-3.5" aria-hidden />
              You've acted — waiting on{" "}
              {state.waitingOn.map((w) => w.name).join(", ") || "no one"}
            </span>
          ) : (
            <span className="text-muted-foreground">
              Your move.{" "}
              {state.waitingOn.length > 1 &&
                `Also waiting: ${state.waitingOn.length - 1} other${state.waitingOn.length > 2 ? "s" : ""}.`}
            </span>
          )}
        </>
      ) : (
        <span className="text-muted-foreground">Free-form turns</span>
      )}
      {isHost && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={toggleMode}
          loading={switching}
        >
          <Repeat className="h-3.5 w-3.5" aria-hidden />
          {state.turnMode === "rounds" ? "Switch to free-form" : "Switch to rounds"}
        </Button>
      )}
    </div>
  );
}
