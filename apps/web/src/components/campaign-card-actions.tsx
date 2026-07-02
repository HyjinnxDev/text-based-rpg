"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";

export function CampaignCardActions({
  campaignId,
  campaignTitle,
}: {
  campaignId: string;
  campaignTitle: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/campaigns/${campaignId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to delete");
      setDeleting(false);
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <span className="hidden text-xs text-muted-foreground sm:inline">Delete forever?</span>
        <Button
          variant="destructive"
          size="sm"
          loading={deleting}
          onClick={handleDelete}
          aria-label={`Confirm delete ${campaignTitle}`}
        >
          Delete
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={deleting}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {error && <span className="text-xs text-destructive">{error}</span>}
      <a
        href={`/api/campaigns/${campaignId}/export`}
        download={`campaign-${campaignId}.json`}
        aria-label={`Export ${campaignTitle}`}
        title="Export campaign JSON"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Download className="h-4 w-4" aria-hidden />
      </a>
      <button
        type="button"
        aria-label={`Delete ${campaignTitle}`}
        title="Delete campaign"
        onClick={() => setConfirming(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
