import { NextResponse } from "next/server";
import { assertCampaignAccess } from "@tbrpg/domain";
import { requireSession } from "@/lib/session";
import { getStorage } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string; z: string; x: string; y: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id, z, x, y } = await ctx.params;
    await assertCampaignAccess(id, session.user.id, "OBSERVER");

    const tileY = y.replace(/\.webp$/i, "");
    const key = `campaigns/${id}/tiles/${z}/${x}/${tileY}.webp`;
    const data = await getStorage().get(key);

    if (!data) {
      return NextResponse.json({ error: "Tile not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    const status = error instanceof Error && error.name === "AccessDeniedError" ? 403 : 404;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status },
    );
  }
}
