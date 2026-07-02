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
  Input,
  Label,
  Textarea,
} from "@/components/ui";
import { ArrowLeft, Dices, PenLine, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type GenerationMode = "rough_idea" | "random" | "custom";

const MODES: Array<{
  id: GenerationMode;
  label: string;
  icon: typeof Sparkles;
  description: string;
}> = [
  {
    id: "rough_idea",
    label: "Rough idea",
    icon: Sparkles,
    description:
      "Describe a rough idea and the AI will generate your world, characters, and opening scene.",
  },
  {
    id: "random",
    label: "Random",
    icon: Dices,
    description:
      "Let the AI surprise you. Optionally steer it with a tone or genre.",
  },
  {
    id: "custom",
    label: "Custom",
    icon: PenLine,
    description:
      "Define the world yourself — title, premise, setting, tone, and genre.",
  },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [mode, setMode] = useState<GenerationMode>("rough_idea");
  const [playMode, setPlayMode] = useState<"SOLO" | "PARTY">("SOLO");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [roughIdea, setRoughIdea] = useState(
    "A floating-city trading company during a magical civil war.",
  );
  const [tone, setTone] = useState("");
  const [genre, setGenre] = useState("");
  const [title, setTitle] = useState("");
  const [premise, setPremise] = useState("");
  const [setting, setSetting] = useState("");
  const [characterName, setCharacterName] = useState("");

  const canSubmit =
    mode === "rough_idea"
      ? roughIdea.trim().length >= 10
      : mode === "random"
        ? true
        : title.trim().length > 0 &&
          premise.trim().length >= 10 &&
          setting.trim().length >= 10 &&
          tone.trim().length > 0 &&
          genre.trim().length > 0;

  async function createCampaign() {
    setLoading(true);
    setError(null);

    const shared = {
      characterName: characterName.trim() || undefined,
      mode: playMode,
    };
    const payload =
      mode === "rough_idea"
        ? { generationMode: "rough_idea", roughIdea, ...shared }
        : mode === "random"
          ? {
              generationMode: "random",
              tone: tone.trim() || undefined,
              genre: genre.trim() || undefined,
              ...shared,
            }
          : {
              generationMode: "custom",
              title: title.trim(),
              premise: premise.trim(),
              setting: setting.trim(),
              tone: tone.trim(),
              genre: genre.trim(),
              ...shared,
            };

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create campaign");
      setLoading(false);
      return;
    }

    router.push(`/campaigns/${data.campaign.id}`);
  }

  const activeMode = MODES.find((m) => m.id === mode)!;

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
          <CardDescription>{activeMode.description}</CardDescription>
        </CardHeader>

        <div
          role="tablist"
          aria-label="Generation mode"
          className="mt-4 grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted p-1"
        >
          {MODES.map((m) => {
            const Icon = m.icon;
            const selected = mode === m.id;
            return (
              <button
                key={m.id}
                role="tab"
                aria-selected={selected}
                onClick={() => setMode(m.id)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                  selected
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{m.label}</span>
                <span className="sm:hidden">{m.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 space-y-4">
          {mode === "rough_idea" && (
            <div className="space-y-2">
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
          )}

          {mode === "random" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tone">Tone (optional)</Label>
                <Input
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="e.g. grim, whimsical, hopeful"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="genre">Genre (optional)</Label>
                <Input
                  id="genre"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="e.g. high fantasy, cyberpunk"
                />
              </div>
            </div>
          )}

          {mode === "custom" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="The Ashen Covenant"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="premise">Premise</Label>
                <Textarea
                  id="premise"
                  rows={4}
                  value={premise}
                  onChange={(e) => setPremise(e.target.value)}
                  placeholder="What the campaign is about — the central conflict, stakes, and hook. (min 10 characters)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setting">Setting</Label>
                <Textarea
                  id="setting"
                  rows={3}
                  value={setting}
                  onChange={(e) => setSetting(e.target.value)}
                  placeholder="Where and when it takes place. (min 10 characters)"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="custom-tone">Tone</Label>
                  <Input
                    id="custom-tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder="e.g. grim, whimsical"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-genre">Genre</Label>
                  <Input
                    id="custom-genre"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="e.g. high fantasy"
                  />
                </div>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="character-name">Character name (optional)</Label>
            <Input
              id="character-name"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              maxLength={80}
              placeholder="Leave blank for “Adventurer”"
            />
          </div>

          <div className="space-y-2">
            <Label>Who's playing?</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPlayMode("SOLO")}
                aria-pressed={playMode === "SOLO"}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  playMode === "SOLO"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="font-medium">Solo</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Just you and the AI
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPlayMode("PARTY")}
                aria-pressed={playMode === "PARTY"}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  playMode === "PARTY"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="font-medium">Party</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Invite friends with a link
                </span>
              </button>
            </div>
          </div>
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
          disabled={!canSubmit}
          loading={loading}
        >
          {!loading && <Sparkles className="h-4 w-4" aria-hidden />}
          {loading ? "Generating world & artwork…" : "Generate campaign"}
        </Button>
      </Card>
    </main>
  );
}
