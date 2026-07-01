import Link from "next/link";
import { getOptionalSession } from "@/lib/session";
import { Button } from "@/components/ui";

export default async function HomePage() {
  const session = await getOptionalSession();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm uppercase tracking-widest text-amber-500">Phase 1</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold text-stone-50">
        Text-Based RPG Platform
      </h1>
      <p className="mt-4 text-stone-400">
        Persistent campaigns with structured state, freeform actions, codex updates,
        and interactive maps.
      </p>

      <div className="mt-8 flex gap-3">
        {session ? (
          <Link href="/campaigns">
            <Button>Your campaigns</Button>
          </Link>
        ) : (
          <>
            <Link href="/login">
              <Button>Sign in</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-stone-800 text-stone-100 hover:bg-stone-700">
                Register
              </Button>
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
