"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { CampaignMap, type MapMarkerData } from "@/components/campaign-map";
import { ScenePanel } from "@/components/scene-panel";
import { CodexPanel } from "@/components/codex-panel";
import { PlayTabBar } from "@/components/play-tab-bar";
import { Card, Badge } from "@/components/ui";
import { useRealtimeCampaign } from "@/hooks/use-realtime-campaign";

interface CampaignData {
  id: string;
  title: string;
  premise: string | null;
  scenes: { id: string; title: string }[];
  mapMarkers: MapMarkerData[];
}

type PlayTab = "scene" | "map" | "codex";

export default function CampaignPlayPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [narration, setNarration] = useState("");
  const [mobileTab, setMobileTab] = useState<PlayTab>("scene");
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
    setCampaign({
      id: data.campaign.id,
      title: data.campaign.title,
      premise: data.campaign.premise,
      scenes: data.campaign.scenes,
      mapMarkers: data.campaign.mapMarkers.map(
        (m: { id: string; label: string; markerType: string; position: unknown }) => ({
          id: m.id,
          label: m.label,
          markerType: m.markerType,
          position: m.position as { lng: number; lat: number },
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
    return (
      <main className="flex min-h-[50dvh] items-center justify-center p-6">
        <p className="animate-pulse text-muted-foreground">Loading campaign…</p>
      </main>
    );
  }

  const markers = liveMarkers.length > 0 ? liveMarkers : campaign.mapMarkers;
  const onlineCount = presence?.players.filter((p) => p.status === "online").length ?? 0;

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-4 sm:px-6 sm:py-6 lg:grid lg:grid-cols-[1fr_380px] lg:gap-6 lg:pb-8 lg:pt-8">
        {/* Campaign header */}
        <div className="mb-4 lg:col-span-2">
          <Link
            href="/campaigns"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Campaigns
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-balance text-2xl font-semibold text-foreground sm:text-3xl">
                {campaign.title}
              </h1>
              {campaign.premise && (
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                  {campaign.premise}
                </p>
              )}
            </div>
            {presence && onlineCount > 0 && (
              <Badge variant="success" className="shrink-0">
                <Users className="mr-1 h-3 w-3" aria-hidden />
                {onlineCount} online
              </Badge>
            )}
          </div>
        </div>

        {/* Mobile: tabbed panels */}
        <div className="space-y-4 lg:hidden">
          {mobileTab === "scene" && (
            <ScenePanel
              connected={connected}
              realtimeEnabled={realtimeEnabled}
              actionStatus={actionStatus}
              narration={narration}
              onNarrationChange={() => {}}
              onSubmit={(action) => submitAction(action, crypto.randomUUID())}
              compact
            />
          )}
          {mobileTab === "map" && (
            <Card className="overflow-hidden p-0">
              <CampaignMap
                markers={markers}
                className="h-[calc(100dvh-14rem)] w-full"
              />
            </Card>
          )}
          {mobileTab === "codex" && <CodexPanel campaignId={campaignId} compact />}
        </div>

        {/* Desktop: two-column layout */}
        <div className="hidden space-y-6 lg:block">
          <Card className="overflow-hidden p-0">
            <CampaignMap markers={markers} className="h-[min(420px,45dvh)] w-full" />
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

        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <CodexPanel campaignId={campaignId} />
          </div>
        </aside>
      </main>

      <PlayTabBar activeTab={mobileTab} onTabChange={setMobileTab} />
    </>
  );
}
