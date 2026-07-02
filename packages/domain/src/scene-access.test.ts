import { describe, expect, it } from "vitest";
import { sceneVisibilityWhere } from "./scene-access";

describe("sceneVisibilityWhere", () => {
  it("hosts see all scenes", () => {
    expect(sceneVisibilityWhere("user-1", "HOST")).toEqual({});
  });

  it("players see open scopes or scenes they participate in", () => {
    expect(sceneVisibilityWhere("user-1", "PLAYER")).toEqual({
      OR: [
        { scope: { in: ["PUBLIC", "PARTY"] } },
        { participants: { some: { userId: "user-1" } } },
      ],
    });
  });

  it("observers get the same restriction as players", () => {
    const where = sceneVisibilityWhere("user-2", "OBSERVER");
    expect(where.OR).toHaveLength(2);
  });
});
