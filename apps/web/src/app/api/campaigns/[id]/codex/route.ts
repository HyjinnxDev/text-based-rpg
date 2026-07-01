import { NextResponse } from "next/server";
import { prisma } from "@tbrpg/db";
import { assertCampaignAccess } from "@tbrpg/domain";
import { requireSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    await assertCampaignAccess(id, session.user.id, "OBSERVER");

    const entries = await prisma.codexEntry.findMany({
      where: { campaignId: id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 403 },
    );
  }
}
