"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Textarea } from "@/components/ui";

export default function NewCampaignPage() {
  const router = useRouter();
  const [roughIdea, setRoughIdea] = useState(
    "A floating-city trading company during a magical civil war.",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createCampaign() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationMode: "rough_idea",
        roughIdea,
        mode: "SOLO",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create campaign");
      setLoading(false);
      return;
    }

    router.push(`/campaigns/${data.campaign.id}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Card>
        <h1 className="text-xl font-semibold">New campaign from a rough idea</h1>
        <Textarea
          className="mt-4"
          rows={6}
          value={roughIdea}
          onChange={(e) => setRoughIdea(e.target.value)}
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <Button className="mt-4" onClick={createCampaign} disabled={loading}>
          {loading ? "Generating world..." : "Generate campaign"}
        </Button>
      </Card>
    </main>
  );
}
