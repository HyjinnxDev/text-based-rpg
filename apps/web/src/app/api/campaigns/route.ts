import { NextResponse } from "next/server";
import { createCampaignSchema } from "@tbrpg/shared";
import { createCampaign, listCampaigns } from "@tbrpg/domain";
import { requireSession } from "@/lib/session";
import { getAiRouter } from "@/lib/ai";

export async function GET() {
  try {
    const session = await requireSession();
    const campaigns = await listCampaigns(session.user.id);
    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = createCampaignSchema.parse(await request.json());
    const result = await createCampaign(session.user.id, body, getAiRouter());
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
