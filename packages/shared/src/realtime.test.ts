import { describe, it, expect } from "vitest";
import {
  actionSubmitSchema,
  actionResolvedSchema,
  RealtimeRooms,
} from "../src/realtime";

const CUID = "clh3v1k2k0000qz5v9k2k2k2k2";

describe("realtime event schemas", () => {
  it("validates action submit payload", () => {
    const parsed = actionSubmitSchema.parse({
      campaignId: CUID,
      intent: "Search the room",
      clientRequestId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(parsed.intent).toBe("Search the room");
  });

  it("validates action resolved broadcast payload", () => {
    const parsed = actionResolvedSchema.parse({
      clientRequestId: "550e8400-e29b-41d4-a716-446655440000",
      pendingActionId: CUID,
      campaignId: CUID,
      narration: "You search the room.",
      worldTime: { day: 1, hour: 9, season: "spring", calendarLabel: "Day 1" },
      campaignEventSequence: 3,
      mapMarkers: [],
      codexUpdates: [],
      visibility: { scope: "party" },
    });
    expect(parsed.narration).toContain("search");
  });
});
