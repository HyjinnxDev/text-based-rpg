"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";

interface CodexEntry {
  id: string;
  title: string;
  category: string;
  content: { body?: string };
  updatedAt: string;
}

export function CodexPanel({ campaignId }: { campaignId: string }) {
  const [entries, setEntries] = useState<CodexEntry[]>([]);

  async function load() {
    const res = await fetch(`/api/campaigns/${campaignId}/codex`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
    }
  }

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("campaign-updated", handler);
    return () => window.removeEventListener("campaign-updated", handler);
  }, [campaignId]);

  return (
    <Card>
      <h2 className="text-lg font-semibold text-stone-100">Codex</h2>
      <ul className="mt-3 max-h-[360px] space-y-3 overflow-y-auto">
        {entries.map((entry) => (
          <li key={entry.id} className="border-b border-stone-800 pb-3 last:border-0">
            <p className="text-xs uppercase tracking-wide text-amber-500/80">
              {entry.category}
            </p>
            <p className="font-medium text-stone-200">{entry.title}</p>
            <p className="mt-1 text-sm text-stone-400">
              {entry.content?.body ?? JSON.stringify(entry.content)}
            </p>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="text-sm text-stone-500">No codex entries yet.</li>
        )}
      </ul>
    </Card>
  );
}
