import { NextResponse } from "next/server";
import { getCampaignPanelState } from "@tbrpg/domain";
import { requireSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const sceneId = new URL(req.url).searchParams.get("sceneId") ?? undefined;
    const state = await getCampaignPanelState(id, session.user.id, sceneId);
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 403 },
    );
  }
}
