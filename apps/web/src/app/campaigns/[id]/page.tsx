"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import type { CampaignMapConfig } from "@tbrpg/shared";
import { parseCampaignMapConfig } from "@tbrpg/shared";
import { CampaignMap, type MapMarkerData } from "@/components/campaign-map";
import { ScenePanel } from "@/components/scene-panel";
import { CodexPanel } from "@/components/codex-panel";
import { JournalPanel } from "@/components/journal-panel";
import { InviteButton } from "@/components/invite-button";
import { MembersBar } from "@/components/members-bar";
import { TurnBar } from "@/components/turn-bar";
import { PlayTabBar, type PlayTab } from "@/components/play-tab-bar";
import { CampaignPlaySkeleton } from "@/components/campaign-play-skeleton";
import { Card, Badge } from "@/components/ui";
import { useRealtimeCampaign } from "@/hooks/use-realtime-campaign";

interface CampaignData {
  id: string;
  title: string;
  premise: string | null;
  mode: string;
  scenes: { id: string; title: string; locationId: string | null }[];
  mapMarkers: MapMarkerData[];
  mapConfig: CampaignMapConfig | null;
  landscapeUrl: string | null;
}

export default function CampaignPlayPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [narration, setNarration] = useState("");
  const [mobileTab, setMobileTab] = useState<PlayTab>("scene");
  const activeSceneId = campaign?.scenes[0]?.id;

  const {
    realtimeEnabled,
    connected,
    connecting,
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
    if (!res.ok) {
      setLoadState("error");
      return;
    }
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
      mode: data.campaign.mode,
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
    setLoadState("ready");
  }

  useEffect(() => {
    setLoadState("loading");
    setCampaign(null);
    loadCampaign();
    const handler = () => loadCampaign();
    window.addEventListener("campaign-updated", handler);
    return () => window.removeEventListener("campaign-updated", handler);
  }, [campaignId]);

  if (loadState === "loading") {
    return <CampaignPlaySkeleton />;
  }

  if (loadState === "error" || !campaign) {
    return (
      <main className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted-foreground">Could not load this campaign.</p>
        <Link href="/campaigns" className="text-sm text-primary hover:underline">
          Back to campaigns
        </Link>
      </main>
    );
  }

  const markers = liveMarkers.length > 0 ? liveMarkers : campaign.mapMarkers;
  const onlineCount = presence?.players.filter((p) => p.status === "online").length ?? 0;

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-4 sm:px-6 sm:py-6 lg:grid lg:grid-cols-[1fr_380px] lg:gap-6 lg:pb-8 lg:pt-8">
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
              {campaign.mode !== "SOLO" && <MembersBar campaignId={campaignId} />}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {presence && onlineCount > 0 && (
                <Badge variant="success" className="shrink-0">
                  <Users className="mr-1 h-3 w-3" aria-hidden />
                  {onlineCount} online
                </Badge>
              )}
              {campaign.mode !== "SOLO" && <InviteButton campaignId={campaignId} />}
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:hidden">
          {mobileTab === "scene" && (
            <>
              {campaign.mode !== "SOLO" && activeSceneId && (
                <TurnBar campaignId={campaignId} sceneId={activeSceneId} />
              )}
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
              <ScenePanel
                connected={connected}
                connecting={connecting}
                realtimeEnabled={realtimeEnabled}
                actionStatus={actionStatus}
                narration={narration}
                onNarrationChange={() => {}}
                onSubmit={(action) => submitAction(action, crypto.randomUUID())}
                compact
              />
            </>
          )}
          {mobileTab === "map" && (
            <Card className="overflow-hidden p-0">
              <CampaignMap
                markers={markers}
                mapConfig={campaign.mapConfig}
                className="h-[calc(100dvh-14rem)] w-full"
              />
            </Card>
          )}
          {mobileTab === "journal" && <JournalPanel campaignId={campaignId} compact />}
          {mobileTab === "codex" && <CodexPanel campaignId={campaignId} compact />}
        </div>

        <div className="hidden space-y-6 lg:block">
          {campaign.mode !== "SOLO" && activeSceneId && (
            <TurnBar campaignId={campaignId} sceneId={activeSceneId} />
          )}
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
              className="h-[min(420px,45dvh)] w-full"
            />
          </Card>

          <ScenePanel
            connected={connected}
            connecting={connecting}
            realtimeEnabled={realtimeEnabled}
            actionStatus={actionStatus}
            narration={narration}
            onNarrationChange={() => {}}
            onSubmit={(action) => submitAction(action, crypto.randomUUID())}
          />
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-6">
            <JournalPanel campaignId={campaignId} />
            <CodexPanel campaignId={campaignId} />
          </div>
        </aside>
      </main>

      <PlayTabBar activeTab={mobileTab} onTabChange={setMobileTab} />
    </>
  );
}
