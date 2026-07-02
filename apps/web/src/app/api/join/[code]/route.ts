import { NextResponse } from "next/server";
import { z } from "zod";
import { getInvitePreview, joinCampaignByCode } from "@tbrpg/domain";
import { requireSession } from "@/lib/session";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { code } = await ctx.params;
    const preview = await getInvitePreview(code);
    return NextResponse.json({ preview });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 404 },
    );
  }
}

const joinSchema = z.object({
  characterName: z.string().min(1).max(80).optional(),
});

export async function POST(req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { code } = await ctx.params;
    const body = joinSchema.parse(await req.json().catch(() => ({})));
    const result = await joinCampaignByCode(code, session.user.id, body.characterName);
    return NextResponse.json(result);
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const status =
      name === "NotFoundError" ? 404 : name === "AccessDeniedError" ? 403 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status },
    );
  }
}
