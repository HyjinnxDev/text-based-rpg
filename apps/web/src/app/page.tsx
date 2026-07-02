import Link from "next/link";
import { getOptionalSession } from "@/lib/session";
import { Button } from "@/components/ui";
import { BookOpen, Map, Scroll, Swords } from "lucide-react";

export default async function HomePage() {
  const session = await getOptionalSession();

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-4xl flex-col justify-center px-4 py-12 sm:px-6 sm:py-20">
      <div className="text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary sm:text-sm">
          AI-Powered Adventures
        </p>
        <h1 className="mt-3 text-balance text-4xl font-semibold text-foreground sm:text-5xl lg:text-6xl">
          Your story, endlessly unfolding
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:mx-0 sm:text-lg">
          Persistent campaigns with structured state, freeform actions, a living codex,
          and interactive maps — all driven by AI.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Scroll,
            title: "Persistent worlds",
            desc: "Campaign state survives every session",
          },
          {
            icon: BookOpen,
            title: "Freeform actions",
            desc: "Describe anything — the AI resolves it",
          },
          {
            icon: Map,
            title: "Living maps",
            desc: "Explore locations that evolve with play",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-xl border border-border/60 bg-card/50 p-4 backdrop-blur-sm"
          >
            <Icon className="mb-2 h-5 w-5 text-primary" aria-hidden />
            <p className="font-medium text-foreground">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-start">
        {session ? (
          <Link href="/campaigns" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto">
              <Swords className="h-4 w-4" aria-hidden />
              Your campaigns
            </Button>
          </Link>
        ) : (
          <>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                Sign in
              </Button>
            </Link>
            <Link href="/register" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Create account
              </Button>
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
