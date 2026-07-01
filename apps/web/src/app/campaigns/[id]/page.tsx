"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { CampaignMapConfig } from "@tbrpg/shared";
import { parseCampaignMapConfig } from "@tbrpg/shared";
import { CampaignMap, type MapMarkerData } from "@/components/campaign-map";
import { ScenePanel } from "@/components/scene-panel";
import { CodexPanel } from "@/components/codex-panel";
import { Card } from "@/components/ui";
import { useRealtimeCampaign } from "@/hooks/use-realtime-campaign";

interface CampaignData {
  id: string;
  title: string;
  premise: string | null;
  scenes: { id: string; title: string; locationId: string | null }[];
  mapMarkers: MapMarkerData[];
  mapConfig: CampaignMapConfig | null;
  landscapeUrl: string | null;
}

export default function CampaignPlayPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [narration, setNarration] = useState("");
  const activeSceneId = campaign?.scenes[0]?.id;

  const {
    realtimeEnabled,
    connected,
    presence,
    lastResolved,
    mapMarkers: liveMarkers,
    actionStatus,
    submitAction,
  } = useRealtimeCampaign(campaignId, activeSceneId);

  useEffect(() => {
    if (lastResolved?.narration) {
      setNarration(lastResolved.narration);
      window.dispatchEvent(new CustomEvent("campaign-updated"));
    }
  }, [lastResolved]);

  async function loadCampaign() {
    const res = await fetch(`/api/campaigns/${campaignId}`);
    if (!res.ok) return;
    const data = await res.json();

    const portraits = new Map<string, string>();
    for (const c of data.campaign.characters ?? []) {
      if (c.portraitUrl) portraits.set(c.id, c.portraitUrl);
    }
    for (const n of data.campaign.npcs ?? []) {
      if (n.portraitUrl) portraits.set(n.id, n.portraitUrl);
    }

    const startLocation = data.campaign.locations?.find(
      (l: { metadata?: { isStartingLocation?: boolean } }) =>
        l.metadata?.isStartingLocation,
    );

    setCampaign({
      id: data.campaign.id,
      title: data.campaign.title,
      premise: data.campaign.premise,
      scenes: data.campaign.scenes,
      mapConfig: parseCampaignMapConfig(data.campaign.settings),
      landscapeUrl: (startLocation?.metadata as { landscapeUrl?: string })?.landscapeUrl ?? null,
      mapMarkers: data.campaign.mapMarkers.map(
        (m: {
          id: string;
          label: string;
          markerType: string;
          position: unknown;
          entityId: string | null;
        }) => ({
          id: m.id,
          label: m.label,
          markerType: m.markerType,
          position: m.position as MapMarkerData["position"],
          portraitUrl: m.entityId ? portraits.get(m.entityId) : null,
        }),
      ),
    });
  }

  useEffect(() => {
    loadCampaign();
    const handler = () => loadCampaign();
    window.addEventListener("campaign-updated", handler);
    return () => window.removeEventListener("campaign-updated", handler);
  }, [campaignId]);

  if (!campaign) {
    return <main className="p-10 text-stone-500">Loading campaign...</main>;
  }

  const markers = liveMarkers.length > 0 ? liveMarkers : campaign.mapMarkers;

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-50">{campaign.title}</h1>
          {campaign.premise && (
            <p className="mt-1 text-sm text-stone-400">{campaign.premise}</p>
          )}
          {presence && (
            <p className="mt-1 text-xs text-stone-500">
              {presence.players.filter((p) => p.status === "online").length} player(s) online
            </p>
          )}
        </div>

        {campaign.landscapeUrl && (
          <Card className="overflow-hidden p-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={campaign.landscapeUrl}
              alt="Current location"
              className="h-40 w-full object-cover"
            />
          </Card>
        )}

        <Card className="overflow-hidden p-0">
          <CampaignMap
            markers={markers}
            mapConfig={campaign.mapConfig}
            className="h-[420px] w-full"
          />
        </Card>

        <ScenePanel
          connected={connected}
          realtimeEnabled={realtimeEnabled}
          actionStatus={actionStatus}
          narration={narration}
          onNarrationChange={() => {}}
          onSubmit={(action) => submitAction(action, crypto.randomUUID())}
        />
      </div>

      <aside>
        <CodexPanel campaignId={campaignId} />
      </aside>
    </main>
  );
}
