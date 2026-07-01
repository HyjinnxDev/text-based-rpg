import { Card, Skeleton } from "@/components/ui";

export function CampaignPlaySkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-4 sm:px-6 sm:py-6 lg:grid lg:grid-cols-[1fr_380px] lg:gap-6 lg:pb-8 lg:pt-8">
      <div className="mb-4 lg:col-span-2" aria-hidden>
        <Skeleton className="mb-3 h-4 w-24" />
        <Skeleton className="h-8 w-2/3 max-w-md" />
        <Skeleton className="mt-2 h-4 w-full max-w-lg" />
      </div>

      <div className="space-y-6" aria-hidden>
        <Card className="overflow-hidden p-0">
          <Skeleton className="h-[min(420px,45dvh)] w-full rounded-none" />
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-11 w-32" />
        </Card>
      </div>

      <aside className="hidden lg:block" aria-hidden>
        <Card className="space-y-3">
          <Skeleton className="h-6 w-20" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border/50 p-3">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </Card>
      </aside>
    </main>
  );
}

export function CodexSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border/50 p-3">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}
