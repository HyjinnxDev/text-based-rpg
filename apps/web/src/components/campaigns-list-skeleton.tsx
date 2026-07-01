import { Card, Skeleton } from "@/components/ui";

export function CampaignsListSkeleton() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-full sm:w-36" />
      </div>

      <ul className="mt-8 space-y-3" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i}>
            <Card className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-5 shrink-0" />
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
