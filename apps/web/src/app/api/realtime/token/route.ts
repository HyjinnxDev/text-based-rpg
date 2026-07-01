import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@tbrpg/db";
import { requireSession } from "@/lib/session";

/** Returns a short-lived session token for the dedicated realtime service */
export async function GET() {
  try {
    const session = await requireSession();
    const dbSession = await prisma.session.findFirst({
      where: { userId: session.user.id, expiresAt: { gt: new Date() } },
      orderBy: { updatedAt: "desc" },
    });

    if (!dbSession) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }

    return NextResponse.json({
      token: dbSession.token,
      expiresAt: dbSession.expiresAt.toISOString(),
      realtimeUrl: process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:3001",
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
