"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Textarea,
} from "@/components/ui";
import { ArrowLeft, Sparkles } from "lucide-react";

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
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/campaigns"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to campaigns
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">New campaign</CardTitle>
          <CardDescription>
            Describe a rough idea and the AI will generate your world, characters, and opening scene.
          </CardDescription>
        </CardHeader>

        <div className="mt-6 space-y-2">
          <Label htmlFor="rough-idea">Your rough idea</Label>
          <Textarea
            id="rough-idea"
            rows={6}
            value={roughIdea}
            onChange={(e) => setRoughIdea(e.target.value)}
            placeholder="A haunted lighthouse on a storm-wracked coast where time moves differently…"
            className="min-h-[160px]"
          />
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button
          className="mt-6 w-full sm:w-auto"
          size="lg"
          onClick={createCampaign}
          disabled={!roughIdea.trim()}
          loading={loading}
        >
          {!loading && <Sparkles className="h-4 w-4" aria-hidden />}
          {loading ? "Generating world…" : "Generate campaign"}
        </Button>
      </Card>
    </main>
  );
}
