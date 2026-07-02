"use client";

import { useCallback, useEffect, useState } from "react";

export interface PanelCodexEntry {
  id: string;
  title: string;
  category: string;
  content: { body?: string };
  updatedAt: string;
}

export interface PanelItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  quantity: number;
}

export interface PanelQuest {
  id: string;
  title: string;
  description: string | null;
  status: string;
  threadType: string;
}

export interface PanelMember {
  userId: string;
  role: "HOST" | "PLAYER" | "OBSERVER";
  name: string | null;
  email: string;
  characterName: string | null;
  portraitUrl: string | null;
}

export interface PanelNpc {
  id: string;
  name: string;
  portraitUrl: string | null;
  role: string | null;
  summary: string | null;
  mood: string | null;
  alive: boolean;
  recentMemories: string[];
}

export interface PanelTurnState {
  viewerRole: "HOST" | "PLAYER" | "OBSERVER";
  turnMode: "free" | "rounds";
  round: number;
  waitingOn: Array<{ userId: string; name: string }>;
  youHaveActed: boolean;
}

export interface PanelState {
  viewerRole: "HOST" | "PLAYER" | "OBSERVER";
  latestNarration: string | null;
  codexEntries: PanelCodexEntry[];
  items: PanelItem[];
  quests: PanelQuest[];
  members: PanelMember[];
  npcs: PanelNpc[];
  turns: PanelTurnState | null;
}

/**
 * One fetch for all side panels (codex, journal, members, turns) instead of
 * four separate requests per `campaign-updated` event.
 */
export function useCampaignPanels(campaignId: string, sceneId?: string) {
  const [state, setState] = useState<PanelState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reset synchronously during render when switching campaigns so the panels
  // don't flash another campaign's data.
  const [loadedFor, setLoadedFor] = useState(campaignId);
  if (loadedFor !== campaignId) {
    setLoadedFor(campaignId);
    setState(null);
    setLoading(true);
  }

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const query = sceneId ? `?sceneId=${encodeURIComponent(sceneId)}` : "";
        const res = await fetch(`/api/campaigns/${campaignId}/state${query}`);
        if (res.ok) setState(await res.json());
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [campaignId, sceneId],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the fetch resolves, not synchronously
    load();
    const handler = () => load(true);
    window.addEventListener("campaign-updated", handler);
    return () => window.removeEventListener("campaign-updated", handler);
  }, [load]);

  return { state, loading, refreshing, refresh: () => load(true) };
}
