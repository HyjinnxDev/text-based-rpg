"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { Card, CardHeader, CardTitle, Badge, Spinner } from "@/components/ui";
import { CodexSkeleton } from "@/components/campaign-play-skeleton";
import { cn } from "@/lib/utils";
import type { PanelItem, PanelNpc, PanelQuest } from "@/hooks/use-campaign-panels";

type JournalTab = "quests" | "items" | "npcs";

const QUEST_STATUS_VARIANT: Record<string, "default" | "success" | "muted"> = {
  active: "default",
  completed: "success",
  failed: "muted",
};

function NpcPortrait({ npc }: { npc: PanelNpc }) {
  if (npc.portraitUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={npc.portraitUrl}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full border border-border/60 object-cover"
      />
    );
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted">
      <UserRound className="h-5 w-5 text-muted-foreground" aria-hidden />
    </span>
  );
}

export function JournalPanel({
  items,
  quests,
  npcs,
  loading,
  refreshing,
  compact,
}: {
  items: PanelItem[];
  quests: PanelQuest[];
  npcs: PanelNpc[];
  loading: boolean;
  refreshing: boolean;
  compact?: boolean;
}) {
  const [tab, setTab] = useState<JournalTab>("quests");

  return (
    <Card
      className={cn(
        "flex flex-col",
        compact ? "h-full border-0 bg-transparent p-0 shadow-none" : "h-full",
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Journal</CardTitle>
          {refreshing && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Spinner size="sm" />
              Updating
            </span>
          )}
        </div>
        <div className="mt-2 flex gap-1.5">
          {(["quests", "items", "npcs"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                tab === t
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "quests"
                ? `Quests (${quests.length})`
                : t === "items"
                  ? `Items (${items.length})`
                  : `NPCs (${npcs.length})`}
            </button>
          ))}
        </div>
      </CardHeader>

      <div
        className={cn(
          "scrollbar-thin mt-3 flex-1 overflow-y-auto",
          compact
            ? "max-h-[calc(100dvh-12rem)]"
            : "max-h-[min(480px,50dvh)] lg:max-h-[calc(100dvh-14rem)]",
        )}
      >
        {loading ? (
          <CodexSkeleton rows={compact ? 3 : 4} />
        ) : tab === "quests" ? (
          <ul className="space-y-3">
            {quests.map((quest) => (
              <li
                key={quest.id}
                className="rounded-lg border border-border/50 bg-muted/30 p-3 transition-colors hover:border-border"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={QUEST_STATUS_VARIANT[quest.status] ?? "muted"}>
                    {quest.status}
                  </Badge>
                  <Badge variant="muted">{quest.threadType}</Badge>
                </div>
                <p className="mt-1.5 font-medium text-foreground">{quest.title}</p>
                {quest.description && (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {quest.description}
                  </p>
                )}
              </li>
            ))}
            {quests.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">
                No quests yet. The story will bring them to you.
              </li>
            )}
          </ul>
        ) : tab === "npcs" ? (
          <ul className="space-y-3">
            {npcs.map((npc) => (
              <li
                key={npc.id}
                className="rounded-lg border border-border/50 bg-muted/30 p-3 transition-colors hover:border-border"
              >
                <div className="flex items-start gap-3">
                  <NpcPortrait npc={npc} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-medium text-foreground">{npc.name}</p>
                      {npc.mood && <Badge variant="default">{npc.mood}</Badge>}
                      {!npc.alive && <Badge variant="muted">deceased</Badge>}
                    </div>
                    {(npc.role || npc.summary) && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {[npc.role, npc.summary].filter(Boolean).join(" — ")}
                      </p>
                    )}
                    {npc.recentMemories.length > 0 && (
                      <ul className="mt-2 space-y-1 border-l-2 border-border/60 pl-2.5">
                        {npc.recentMemories.map((memoryEvent, i) => (
                          <li key={i} className="text-xs leading-relaxed text-muted-foreground">
                            {memoryEvent}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </li>
            ))}
            {npcs.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">
                No one you&apos;ve met yet. The world is full of strangers.
              </li>
            )}
          </ul>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border/50 bg-muted/30 p-3 transition-colors hover:border-border"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground">
                    {item.name}
                    {item.quantity > 1 && (
                      <span className="ml-1.5 text-sm text-muted-foreground">
                        ×{item.quantity}
                      </span>
                    )}
                  </p>
                  <Badge variant="muted">{item.category}</Badge>
                </div>
                {item.description && (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </li>
            ))}
            {items.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">
                No items yet. Loot awaits in the world.
              </li>
            )}
          </ul>
        )}
      </div>
    </Card>
  );
}
