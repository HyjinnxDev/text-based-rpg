import { NextResponse } from "next/server";
import { submitActionSchema } from "@tbrpg/shared";
import { resolvePlayerAction, withCampaignLock } from "@tbrpg/domain";
import { requireSession } from "@/lib/session";
import { getAiRouter } from "@/lib/ai";

type Ctx = { params: Promise<{ id: string }> };

// AI scene resolution can take well over the default function limit — without
// this the platform kills the request and the client hangs on "Resolving".
export const maxDuration = 300;

/**
 * REST fallback for environments without the dedicated realtime service (e.g. Vercel-only).
 * Production multiplayer should use realtime `action:submit` when NEXT_PUBLIC_REALTIME_URL is set.
 */
export async function POST(request: Request, ctx: Ctx) {
  if (process.env.NEXT_PUBLIC_REALTIME_URL) {
    return NextResponse.json(
      {
        error:
          "Use the realtime service for actions. Set NEXT_PUBLIC_REALTIME_URL only when realtime is deployed.",
      },
      { status: 410 },
    );
  }

  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const body = submitActionSchema.parse(await request.json());

    const result = await withCampaignLock(id, () =>
      resolvePlayerAction(id, session.user.id, body.action, body.sceneId, getAiRouter()),
    );

    return NextResponse.json({
      narration: result.narration,
      worldTime: result.worldTime,
      mapMarkers: result.mapMarkers,
      codexUpdates: result.codexUpdates,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 400 },
    );
  }
}
