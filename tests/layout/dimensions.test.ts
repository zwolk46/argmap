import { describe, it, expect } from "vitest";
import { NODE_DIMENSIONS, dimensionsFor } from "@/layout/dimensions";

describe("layout/dimensions", () => {
  it("has an entry for every laid-out NodeType", () => {
    const required = [
      "RootQuestion",
      "SubQuestion",
      "Term",
      "Interpretation",
      "Checkpoint",
      "LogicalGate",
      "Conclusion",
      "Authority",
    ] as const;
    for (const t of required) {
      expect(NODE_DIMENSIONS[t]).toBeDefined();
      expect(NODE_DIMENSIONS[t].width).toBeGreaterThan(0);
      expect(NODE_DIMENSIONS[t].height).toBeGreaterThan(0);
    }
  });

  it("dimensionsFor returns the same value as NODE_DIMENSIONS lookup", () => {
    expect(dimensionsFor("RootQuestion")).toEqual(NODE_DIMENSIONS.RootQuestion);
  });

  it("dimensionsFor returns undefined for Premise", () => {
    // @ts-expect-error -- Premise is a NodeType but not in NODE_DIMENSIONS
    expect(dimensionsFor("Premise")).toBeUndefined();
  });
});
