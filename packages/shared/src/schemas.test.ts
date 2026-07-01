import { describe, it, expect } from "vitest";
import { stateDeltaSchema, createCampaignSchema } from "../src/schemas";

describe("stateDeltaSchema", () => {
  it("accepts minimal valid delta", () => {
    const result = stateDeltaSchema.parse({
      narration: "You step into the tavern.",
    });
    expect(result.narration).toContain("tavern");
    expect(result.inventoryChanges).toEqual([]);
  });

  it("rejects empty narration", () => {
    expect(() => stateDeltaSchema.parse({ narration: "" })).toThrow();
  });
});

describe("createCampaignSchema", () => {
  it("requires minimum rough idea length", () => {
    expect(() =>
      createCampaignSchema.parse({
        generationMode: "rough_idea",
        roughIdea: "too short",
      }),
    ).toThrow();
  });
});
