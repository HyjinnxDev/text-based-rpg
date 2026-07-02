"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getRealtimeClient } from "@tbrpg/realtime/client";
import type {
  actionResolvedSchema,
  catchUpStateSchema,
  mapMarkerBroadcastSchema,
  presenceStateSchema,
} from "@tbrpg/shared";
import type { z } from "zod";

type ActionResolved = z.infer<typeof actionResolvedSchema>;
type CatchUpState = z.infer<typeof catchUpStateSchema>;
type MapMarker = z.infer<typeof mapMarkerBroadcastSchema>;
type PresenceState = z.infer<typeof presenceStateSchema>;

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL;
export const realtimeEnabled = Boolean(REALTIME_URL);

export function useRealtimeCampaign(campaignId: string, sceneId?: string, partyId?: string) {
  const clientRef = useRef(getRealtimeClient());
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(realtimeEnabled);
  const [presence, setPresence] = useState<PresenceState | null>(null);
  const [lastResolved, setLastResolved] = useState<ActionResolved | null>(null);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const lastSequenceRef = useRef(0);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  /** Never leave the composer stuck on "Resolving" — fail after a hard cap. */
  const armWatchdog = useCallback(() => {
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      setActionStatus(null);
      setActionError(
        "The world took too long to respond. Your action may not have been applied — try again.",
      );
    }, 180_000);
  }, [clearWatchdog]);

  const submitActionRest = useCallback(
    async (intent: string, sceneId?: string) => {
      setActionStatus("processing");
      setActionError(null);
      armWatchdog();
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: intent, sceneId }),
          signal: AbortSignal.timeout(170_000),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error ?? `Action failed (${res.status})`);
        }

        setLastResolved({
          clientRequestId: crypto.randomUUID(),
          pendingActionId: "",
          campaignId,
          sceneId,
          narration: data.narration,
          worldTime: data.worldTime,
          campaignEventSequence: 0,
          mapMarkers: data.mapMarkers ?? [],
          codexUpdates: data.codexUpdates ?? [],
          visibility: { scope: "party" },
        });
        if (data.mapMarkers?.length) setMapMarkers(data.mapMarkers);
        setActionStatus("completed");
      } catch (error) {
        setActionStatus(null);
        setActionError(
          error instanceof DOMException && error.name === "TimeoutError"
            ? "The world took too long to respond. Your action may not have been applied — try again."
            : error instanceof Error
              ? error.message
              : "Something went wrong resolving your action.",
        );
      } finally {
        clearWatchdog();
      }
    },
    [campaignId, armWatchdog, clearWatchdog],
  );

  const connect = useCallback(async () => {
    if (!realtimeEnabled) return;
    setConnecting(true);

    const res = await fetch("/api/realtime/token");
    if (!res.ok) return;
    const { token } = await res.json();

    const client = clientRef.current;
    client.connect(token);

    const onConnect = () => {
      setConnected(true);
      setConnecting(false);
      client.send("presence:join", { campaignId, sceneId, partyId });
      client.send("catch-up:request", {
        campaignId,
        lastEventSequence: lastSequenceRef.current,
      });
    };

    if (client.connected) onConnect();

    const interval = setInterval(() => {
      if (client.connected) {
        clearInterval(interval);
        onConnect();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [campaignId, sceneId, partyId]);

  useEffect(() => {
    if (!realtimeEnabled) return;

    const client = clientRef.current;
    const cleanups: Array<() => void> = [];

    // eslint-disable-next-line react-hooks/set-state-in-effect -- connection state is set from async socket callbacks
    void connect();

    cleanups.push(
      client.on("presence:update", (p) => setPresence(p)),
      client.on("action:status", (s) => {
        setActionStatus(s.status);
        if (s.status === "failed") {
          clearWatchdog();
          setActionStatus(null);
          setActionError(s.message ?? "Your action could not be resolved. Try again.");
        }
      }),
      client.on("action:resolved", (r) => {
        clearWatchdog();
        setLastResolved(r);
        lastSequenceRef.current = r.campaignEventSequence;
        setMapMarkers(r.mapMarkers);
        setActionStatus("completed");
      }),
      client.on("map:token-moved", (m) => {
        setMapMarkers((prev) => {
          const idx = prev.findIndex((x) => x.id === m.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = m;
            return next;
          }
          return [...prev, m];
        });
      }),
      client.on("catch-up:state", (s: CatchUpState) => {
        if (s.mapMarkers.length) setMapMarkers(s.mapMarkers);
        if (s.recentEvents.length) {
          lastSequenceRef.current = s.recentEvents[s.recentEvents.length - 1].sequence;
        }
      }),
    );

    return () => {
      cleanups.forEach((fn) => fn());
      client.send("presence:leave", { campaignId });
      client.disconnect();
      setConnected(false);
      setConnecting(false);
    };
  }, [campaignId, connect, clearWatchdog]);

  const submitAction = useCallback(
    (intent: string, clientRequestId: string, sceneIdArg?: string) => {
      if (!realtimeEnabled) {
        void submitActionRest(intent, sceneIdArg ?? sceneId);
        return;
      }
      setActionError(null);
      armWatchdog();
      clientRef.current.send("action:submit", {
        campaignId,
        sceneId: sceneIdArg ?? sceneId,
        intent,
        clientRequestId,
      });
      setActionStatus("received");
    },
    [campaignId, sceneId, submitActionRest, armWatchdog],
  );

  return {
    realtimeEnabled,
    connected: realtimeEnabled ? connected : true,
    connecting: realtimeEnabled ? connecting : false,
    presence,
    lastResolved,
    mapMarkers,
    actionStatus,
    actionError,
    submitAction,
  };
}
