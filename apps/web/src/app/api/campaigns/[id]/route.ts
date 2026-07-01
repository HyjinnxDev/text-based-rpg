import { NextResponse } from "next/server";
import { getCampaign, deleteCampaign, exportCampaign } from "@tbrpg/domain";
import { requireSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const campaign = await getCampaign(id, session.user.id);
    return NextResponse.json({ campaign });
  } catch (error) {
    const status = error instanceof Error && error.name === "AccessDeniedError" ? 403 : 404;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status },
    );
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    await deleteCampaign(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 403 },
    );
  }
}
