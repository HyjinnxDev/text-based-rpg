import { describe, it, expect } from "vitest";
import { RealtimeRooms } from "@tbrpg/shared";
import { planBroadcast } from "../src/broadcast";

describe("RealtimeRooms", () => {
  it("uses canonical naming conventions", () => {
    expect(RealtimeRooms.campaign("abc")).toBe("campaign:abc");
    expect(RealtimeRooms.party("p1")).toBe("party:p1");
    expect(RealtimeRooms.scene("s1")).toBe("scene:s1");
    expect(RealtimeRooms.privateScene("s1")).toBe("private-scene:s1");
    expect(RealtimeRooms.player("u1")).toBe("player:u1");
    expect(RealtimeRooms.host("c1")).toBe("host:c1");
  });
});

describe("planBroadcast", () => {
  it("targets private scene room for private visibility", () => {
    const plan = planBroadcast({
      campaignId: "c1",
      sceneId: "s1",
      sceneScope: "PRIVATE",
      actorUserId: "u1",
    });
    expect(plan.rooms).toContain("private-scene:s1");
    expect(plan.rooms).toContain("player:u1");
  });

  it("targets party and scene for party scope", () => {
    const plan = planBroadcast({
      campaignId: "c1",
      sceneId: "s1",
      sceneScope: "PARTY",
      partyId: "p1",
      actorUserId: "u1",
    });
    expect(plan.rooms).toContain("party:p1");
    expect(plan.rooms).toContain("scene:s1");
  });
});
