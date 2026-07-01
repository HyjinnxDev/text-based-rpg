import { NextResponse } from "next/server";
import { exportCampaign } from "@tbrpg/domain";
import { requireSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const data = await exportCampaign(id, session.user.id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 403 },
    );
  }
}
