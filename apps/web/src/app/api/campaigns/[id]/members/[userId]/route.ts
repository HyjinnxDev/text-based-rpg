import { NextResponse } from "next/server";
import { removeCampaignMember } from "@tbrpg/domain";
import { requireSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id, userId } = await ctx.params;
    await removeCampaignMember(id, session.user.id, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 403 },
    );
  }
}
