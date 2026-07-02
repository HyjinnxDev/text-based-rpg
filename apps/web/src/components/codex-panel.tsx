"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, Badge, Spinner } from "@/components/ui";
import { CodexSkeleton } from "@/components/campaign-play-skeleton";

interface CodexEntry {
  id: string;
  title: string;
  category: string;
  content: { body?: string };
  updatedAt: string;
}

export function CodexPanel({
  campaignId,
  compact,
}: {
  campaignId: string;
  compact?: boolean;
}) {
  const [entries, setEntries] = useState<CodexEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/codex`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
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

  const categories = useMemo(() => {
    const cats = [...new Set(entries.map((e) => e.category))];
    return cats.sort();
  }, [entries]);

  const filtered = activeCategory
    ? entries.filter((e) => e.category === activeCategory)
    : entries;

  return (
    <Card
      className={`flex flex-col ${compact ? "h-full border-0 bg-transparent p-0 shadow-none" : "h-full"}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Codex</CardTitle>
          {refreshing && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Spinner size="sm" />
              Updating
            </span>
          )}
        </div>
        {!loading && categories.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                activeCategory === null
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      <div
        className={`scrollbar-thin mt-3 flex-1 overflow-y-auto ${
          compact ? "max-h-[calc(100dvh-12rem)]" : "max-h-[min(480px,50dvh)] lg:max-h-[calc(100dvh-14rem)]"
        }`}
      >
        {loading ? (
          <CodexSkeleton rows={compact ? 3 : 4} />
        ) : (
          <ul className="space-y-3">
            {filtered.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-border/50 bg-muted/30 p-3 transition-colors hover:border-border"
              >
                <Badge variant="default" className="mb-1.5">
                  {entry.category}
                </Badge>
                <p className="font-medium text-foreground">{entry.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {entry.content?.body ?? JSON.stringify(entry.content)}
                </p>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">
                {entries.length === 0
                  ? "No codex entries yet. Explore the world to discover lore."
                  : "No entries in this category."}
              </li>
            )}
          </ul>
        )}
      </div>
    </Card>
  );
}
