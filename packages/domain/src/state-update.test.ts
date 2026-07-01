import { describe, it, expect } from "vitest";
import { validateStateDelta, StateValidationError } from "../src/state-update";

describe("validateStateDelta", () => {
  it("accepts valid delta", () => {
    const delta = validateStateDelta({ narration: "A door opens." });
    expect(delta.narration).toBe("A door opens.");
  });

  it("rejects invalid delta", () => {
    expect(() => validateStateDelta({ narration: "" })).toThrow(StateValidationError);
  });
});
