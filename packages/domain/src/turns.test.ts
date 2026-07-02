import { describe, expect, it } from "vitest";
import { assertMayActThisRound } from "./turns";

describe("assertMayActThisRound", () => {
  it("allows anyone in free mode (default)", () => {
    expect(() => assertMayActThisRound({}, "user-1")).not.toThrow();
    expect(() => assertMayActThisRound(null, "user-1")).not.toThrow();
  });

  it("allows a player who has not acted this round", () => {
    const meta = { turnMode: "rounds", round: 2, actedUserIds: ["user-2"] };
    expect(() => assertMayActThisRound(meta, "user-1")).not.toThrow();
  });

  it("blocks a player who already acted this round", () => {
    const meta = { turnMode: "rounds", round: 2, actedUserIds: ["user-1"] };
    expect(() => assertMayActThisRound(meta, "user-1")).toThrow(/already acted/);
  });

  it("ignores acted list when mode is free", () => {
    const meta = { turnMode: "free", actedUserIds: ["user-1"] };
    expect(() => assertMayActThisRound(meta, "user-1")).not.toThrow();
  });
});
