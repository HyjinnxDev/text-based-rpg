import { describe, it, expect } from "vitest";
import { RealtimeRooms } from "@tbrpg/shared";

describe("RealtimeGateway contracts", () => {
  it("documents canonical room names", () => {
    expect(RealtimeRooms.campaign("x")).toMatch(/^campaign:/);
    expect(RealtimeRooms.privateScene("x")).toMatch(/^private-scene:/);
  });
});
