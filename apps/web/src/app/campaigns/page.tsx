import Link from "next/link";
import { requireSession } from "@/lib/session";
import { listCampaigns } from "@tbrpg/domain";
import { Button, Card } from "@/components/ui";

export default async function CampaignsPage() {
  const session = await requireSession();
  const campaigns = await listCampaigns(session.user.id);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <p className="text-sm text-stone-500">Signed in as {session.user.email}</p>
        </div>
        <Link href="/campaigns/new">
          <Button>New campaign</Button>
        </Link>
      </div>

      <ul className="mt-8 space-y-3">
        {campaigns.map((campaign) => (
          <li key={campaign.id}>
            <Card className="flex items-center justify-between">
              <div>
                <p className="font-medium text-stone-100">{campaign.title}</p>
                <p className="text-sm text-stone-500">{campaign.status}</p>
              </div>
              <Link href={`/campaigns/${campaign.id}`}>
                <Button className="bg-stone-800 text-stone-100 hover:bg-stone-700">
                  Play
                </Button>
              </Link>
            </Card>
          </li>
        ))}
        {campaigns.length === 0 && (
          <p className="text-stone-500">No campaigns yet. Create one to begin.</p>
        )}
      </ul>
    </main>
  );
}
