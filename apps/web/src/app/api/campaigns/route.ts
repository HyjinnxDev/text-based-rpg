import { NextResponse, after } from "next/server";
import { createCampaignSchema } from "@tbrpg/shared";
import { createCampaign, generateCampaignArt, listCampaigns } from "@tbrpg/domain";
import { requireSession } from "@/lib/session";
import { getAiImageRouter, getAiRouter } from "@/lib/ai";
import { getStorage } from "@/lib/storage";

// Campaign generation + background art can exceed the default limit.
export const maxDuration = 300;

export async function GET() {
  try {
    const session = await requireSession();
    const campaigns = await listCampaigns(session.user.id);
    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = createCampaignSchema.parse(await request.json());

    // Text generation + world seeding only — art renders in the background
    // after the response so the player can start playing immediately.
    const result = await createCampaign(session.user.id, body, getAiRouter());

    const imageRouter = getAiImageRouter();
    if (imageRouter.enabled) {
      const { artInput } = result;
      after(async () => {
        try {
          await generateCampaignArt(artInput, imageRouter, getStorage());
        } catch (error) {
          console.error("Background campaign art generation failed", error);
        }
      });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
