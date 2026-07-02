"use client";

import { useEffect, useState } from "react";
import { Crown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Member {
  userId: string;
  role: "HOST" | "PLAYER" | "OBSERVER";
  name: string | null;
  email: string;
  characterName: string | null;
}

export function MembersBar({ campaignId }: { campaignId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [viewerRole, setViewerRole] = useState<string>("PLAYER");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/campaigns/${campaignId}/members`);
    if (!res.ok) return;
    const data = await res.json();
    setMembers(data.members);
    setViewerRole(data.viewerRole);
  }

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("campaign-updated", handler);
    return () => window.removeEventListener("campaign-updated", handler);
  }, [campaignId]);

  async function removeMember(userId: string) {
    setRemovingId(userId);
    const res = await fetch(`/api/campaigns/${campaignId}/members/${userId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    }
    setRemovingId(null);
    setConfirmingId(null);
  }

  if (members.length <= 1) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Party members">
      {members.map((member) => {
        const label = member.characterName ?? member.name ?? member.email;
        const isHostMember = member.role === "HOST";
        const canRemove = viewerRole === "HOST" && !isHostMember;
        const confirming = confirmingId === member.userId;

        return (
          <span
            key={member.userId}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
              confirming
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "border-border/60 bg-muted/40 text-muted-foreground",
            )}
            title={member.name ?? member.email}
          >
            {isHostMember && <Crown className="h-3 w-3 text-primary" aria-hidden />}
            {label}
            {canRemove && !confirming && (
              <button
                type="button"
                aria-label={`Remove ${label}`}
                onClick={() => setConfirmingId(member.userId)}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-destructive/20 hover:text-destructive"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            )}
            {confirming && (
              <span className="ml-1 inline-flex items-center gap-1">
                <button
                  type="button"
                  disabled={removingId === member.userId}
                  onClick={() => removeMember(member.userId)}
                  className="font-semibold underline disabled:opacity-50"
                >
                  {removingId === member.userId ? "Removing…" : "Remove"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingId(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
