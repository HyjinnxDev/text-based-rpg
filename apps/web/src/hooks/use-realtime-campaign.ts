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
  const [presence, setPresence] = useState<PresenceState | null>(null);
  const [lastResolved, setLastResolved] = useState<ActionResolved | null>(null);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const lastSequenceRef = useRef(0);

  const submitActionRest = useCallback(
    async (intent: string, sceneId?: string) => {
      setActionStatus("processing");
      const res = await fetch(`/api/campaigns/${campaignId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: intent, sceneId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");

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
    },
    [campaignId],
  );

  const connect = useCallback(async () => {
    if (!realtimeEnabled) return;

    const res = await fetch("/api/realtime/token");
    if (!res.ok) return;
    const { token } = await res.json();

    const client = clientRef.current;
    client.connect(token);

    const onConnect = () => {
      setConnected(true);
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

    void connect();

    cleanups.push(
      client.on("presence:update", (p) => setPresence(p)),
      client.on("action:status", (s) => setActionStatus(s.status)),
      client.on("action:resolved", (r) => {
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
    };
  }, [campaignId, connect]);

  const submitAction = useCallback(
    (intent: string, clientRequestId: string, sceneIdArg?: string) => {
      if (!realtimeEnabled) {
        void submitActionRest(intent, sceneIdArg ?? sceneId);
        return;
      }
      clientRef.current.send("action:submit", {
        campaignId,
        sceneId: sceneIdArg ?? sceneId,
        intent,
        clientRequestId,
      });
      setActionStatus("received");
    },
    [campaignId, sceneId, submitActionRest],
  );

  return {
    realtimeEnabled,
    connected: realtimeEnabled ? connected : true,
    presence,
    lastResolved,
    mapMarkers,
    actionStatus,
    submitAction,
  };
}
