import { NextResponse } from "next/server";
import { listCampaignMembers } from "@tbrpg/domain";
import { requireSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const result = await listCampaignMembers(id, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 403 },
    );
  }
}
