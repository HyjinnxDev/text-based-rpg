"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, Badge, Spinner } from "@/components/ui";
import { CodexSkeleton } from "@/components/campaign-play-skeleton";
import { cn } from "@/lib/utils";

interface JournalItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  quantity: number;
}

interface JournalQuest {
  id: string;
  title: string;
  description: string | null;
  status: string;
  threadType: string;
  objectives: unknown;
}

type JournalTab = "quests" | "items";

const QUEST_STATUS_VARIANT: Record<string, "default" | "success" | "muted"> = {
  active: "default",
  completed: "success",
  failed: "muted",
};

export function JournalPanel({
  campaignId,
  compact,
}: {
  campaignId: string;
  compact?: boolean;
}) {
  const [items, setItems] = useState<JournalItem[]>([]);
  const [quests, setQuests] = useState<JournalQuest[]>([]);
  const [tab, setTab] = useState<JournalTab>("quests");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/journal`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setQuests(data.quests);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const handler = () => load(true);
    window.addEventListener("campaign-updated", handler);
    return () => window.removeEventListener("campaign-updated", handler);
  }, [campaignId]);

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
          {(["quests", "items"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize transition-colors",
                tab === t
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "quests" ? `Quests (${quests.length})` : `Items (${items.length})`}
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
