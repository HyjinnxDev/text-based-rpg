"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Swords, Users } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Spinner,
} from "@/components/ui";

interface InvitePreview {
  campaignId: string;
  title: string;
  premise: string | null;
  mode: string;
  maxPlayers: number;
  memberCount: number;
}

export default function JoinPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "invalid">("loading");
  const [characterName, setCharacterName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/join/${params.code}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        setPreview(data.preview);
        setLoadState("ready");
      })
      .catch(() => setLoadState("invalid"));
  }, [params.code]);

  async function join() {
    setJoining(true);
    setError(null);
    const res = await fetch(`/api/join/${params.code}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterName: characterName.trim() || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(
        res.status === 403 && /session|sign|auth/i.test(data.error ?? "")
          ? "You need an account to join."
          : (data.error ?? "Could not join this campaign."),
      );
      setJoining(false);
      return;
    }
    router.push(`/campaigns/${data.campaignId}`);
  }

  if (loadState === "loading") {
    return (
      <main className="flex min-h-[60dvh] items-center justify-center">
        <Spinner />
      </main>
    );
  }

  if (loadState === "invalid" || !preview) {
    return (
      <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted-foreground">
          This invite link is invalid or has been revoked.
        </p>
        <Link href="/" className="text-sm text-primary hover:underline">
          Go home
        </Link>
      </main>
    );
  }

  const spotsLeft = preview.maxPlayers - preview.memberCount;

  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-16">
      <Card>
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" aria-hidden />
            <Badge variant="default">Invitation</Badge>
          </div>
          <CardTitle className="text-xl sm:text-2xl">{preview.title}</CardTitle>
          {preview.premise && <CardDescription>{preview.premise}</CardDescription>}
        </CardHeader>

        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" aria-hidden />
          {preview.memberCount} member{preview.memberCount === 1 ? "" : "s"} ·{" "}
          {spotsLeft > 0 ? `${spotsLeft} spots left` : "Full"}
        </div>

        <div className="mt-6 space-y-2">
          <Label htmlFor="join-character-name">Character name (optional)</Label>
          <Input
            id="join-character-name"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            maxLength={80}
            placeholder="Leave blank for “Adventurer”"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}{" "}
            {/session|account|sign/i.test(error) && (
              <Link href="/login" className="font-medium underline">
                Sign in
              </Link>
            )}
          </div>
        )}

        <Button
          className="mt-6 w-full"
          size="lg"
          onClick={join}
          loading={joining}
          disabled={spotsLeft <= 0}
        >
          {spotsLeft <= 0 ? "Campaign is full" : "Join campaign"}
        </Button>
      </Card>
    </main>
  );
}
