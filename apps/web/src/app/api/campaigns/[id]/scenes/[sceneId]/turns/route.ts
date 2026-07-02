import { NextResponse } from "next/server";
import { z } from "zod";
import { getTurnState, setTurnMode } from "@tbrpg/domain";
import { requireSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string; sceneId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id, sceneId } = await ctx.params;
    const state = await getTurnState(id, session.user.id, sceneId);
    if (!state) return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 403 },
    );
  }
}

const putSchema = z.object({ mode: z.enum(["free", "rounds"]) });

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id, sceneId } = await ctx.params;
    const { mode } = putSchema.parse(await req.json());
    const state = await setTurnMode(id, session.user.id, sceneId, mode);
    if (!state) return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 403 },
    );
  }
}
