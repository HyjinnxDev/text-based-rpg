import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

type Ctx = { params: Promise<{ path: string[] }> };

const MIME: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

export async function GET(_req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const key = path.map(decodeURIComponent).join("/");
  const data = await getStorage().get(key);

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = key.split(".").pop()?.toLowerCase() ?? "webp";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
