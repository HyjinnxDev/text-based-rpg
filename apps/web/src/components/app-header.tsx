import Link from "next/link";
import { getOptionalSession } from "@/lib/session";
import { Button } from "@/components/ui";
import { LogIn, Scroll, Swords, UserPlus } from "lucide-react";

export async function AppHeader() {
  const session = await getOptionalSession();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md safe-top">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-80"
        >
          <Swords className="h-5 w-5 text-primary shrink-0" aria-hidden />
          <span className="font-display text-base font-semibold tracking-tight sm:text-lg">
            Text RPG
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          {session ? (
            <>
              <Link href="/campaigns">
                <Button variant="ghost" size="sm">
                  <Scroll className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Campaigns</span>
                </Button>
              </Link>
              <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground md:inline md:max-w-[200px]">
                {session.user.email}
              </span>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  <LogIn className="h-4 w-4 sm:mr-1.5" aria-hidden />
                  <span className="hidden sm:inline">Sign in</span>
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  <UserPlus className="h-4 w-4 sm:mr-1.5" aria-hidden />
                  <span className="hidden sm:inline">Register</span>
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
