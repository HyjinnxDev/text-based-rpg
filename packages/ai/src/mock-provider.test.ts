import { describe, it, expect } from "vitest";
import { MockAiProvider } from "../src/mock-provider";
import { stateDeltaSchema } from "@tbrpg/shared";

describe("MockAiProvider", () => {
  const provider = new MockAiProvider();

  it("returns structured scene resolution", async () => {
    const res = await provider.generateText({
      taskType: "scene_resolution",
      messages: [{ role: "user", content: "Action: search the room" }],
      structuredSchema: stateDeltaSchema,
    });

    expect(res.structured).toBeTruthy();
    const delta = stateDeltaSchema.parse(res.structured);
    expect(delta.narration.length).toBeGreaterThan(0);
  });
});
