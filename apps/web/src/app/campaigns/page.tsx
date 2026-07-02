import Link from "next/link";
import { requireSession } from "@/lib/session";
import { listCampaigns } from "@tbrpg/domain";
import { Button, Card, Badge } from "@/components/ui";
import { ChevronRight, Plus } from "lucide-react";
import { CampaignCardActions } from "@/components/campaign-card-actions";

export default async function CampaignsPage() {
  const session = await requireSession();
  const campaigns = await listCampaigns(session.user.id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Campaigns
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {session.user.email}
          </p>
        </div>
        <Link href="/campaigns/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4" aria-hidden />
            New campaign
          </Button>
        </Link>
      </div>

      <ul className="mt-8 space-y-3">
        {campaigns.map((campaign) => (
          <li key={campaign.id}>
            <Card className="flex items-center justify-between gap-4 transition-colors hover:border-primary/30 hover:bg-card">
              <Link
                href={`/campaigns/${campaign.id}`}
                className="group flex min-w-0 flex-1 items-center gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground group-hover:text-primary transition-colors">
                    {campaign.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant={campaign.status === "ACTIVE" ? "success" : "muted"} className="capitalize">
                      {campaign.status.toLowerCase()}
                    </Badge>
                    <Badge variant="muted" className="capitalize">
                      {campaign.mode.toLowerCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Last played{" "}
                      {new Intl.DateTimeFormat("en", {
                        month: "short",
                        day: "numeric",
                      }).format(campaign.updatedAt)}
                    </span>
                  </div>
                </div>
                <ChevronRight
                  className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden
                />
              </Link>
              <CampaignCardActions
                campaignId={campaign.id}
                campaignTitle={campaign.title}
              />
            </Card>
          </li>
        ))}
        {campaigns.length === 0 && (
          <Card className="py-12 text-center">
            <p className="text-muted-foreground">No campaigns yet.</p>
            <Link href="/campaigns/new" className="mt-4 inline-block">
              <Button>
                <Plus className="h-4 w-4" aria-hidden />
                Create your first campaign
              </Button>
            </Link>
          </Card>
        )}
      </ul>
    </main>
  );
}
