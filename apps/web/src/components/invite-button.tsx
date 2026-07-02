"use client";

import { useState } from "react";
import { Check, Copy, UserPlus } from "lucide-react";
import { Button } from "@/components/ui";

export function InviteButton({ campaignId }: { campaignId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "copied" | "error">("idle");

  async function copyInviteLink() {
    setState("loading");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/invite`, { method: "POST" });
      if (!res.ok) throw new Error();
      const { code } = await res.json();
      const url = `${window.location.origin}/join/${code}`;
      await navigator.clipboard.writeText(url);
      setState("copied");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2500);
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={copyInviteLink}
      loading={state === "loading"}
      className="shrink-0"
    >
      {state === "copied" ? (
        <>
          <Check className="h-4 w-4" aria-hidden />
          Link copied
        </>
      ) : state === "error" ? (
        "Host only"
      ) : (
        <>
          <UserPlus className="h-4 w-4" aria-hidden />
          <Copy className="hidden h-3 w-3 sm:block" aria-hidden />
          Invite
        </>
      )}
    </Button>
  );
}
