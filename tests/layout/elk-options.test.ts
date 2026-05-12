import { describe, it, expect } from "vitest";
import { ELK_LAYERED_OPTIONS, elkDirectionOptions } from "@/layout/elk-options";

describe("layout/elk-options", () => {
  it("ELK_LAYERED_OPTIONS includes the algorithm key", () => {
    expect(ELK_LAYERED_OPTIONS["elk.algorithm"]).toBe("layered");
  });

  it("ELK_LAYERED_OPTIONS is frozen", () => {
    expect(Object.isFrozen(ELK_LAYERED_OPTIONS)).toBe(true);
    expect(() => {
      (ELK_LAYERED_OPTIONS as Record<string, string>)["elk.algorithm"] = "x";
    }).toThrow(TypeError);
  });

  it("elkDirectionOptions emits a single elk.direction key", () => {
    expect(elkDirectionOptions("DOWN")).toEqual({ "elk.direction": "DOWN" });
    expect(elkDirectionOptions("RIGHT")).toEqual({ "elk.direction": "RIGHT" });
  });

  it("considerModelOrder is set to NODES_AND_EDGES (determinism mechanism 2)", () => {
    expect(ELK_LAYERED_OPTIONS["elk.layered.considerModelOrder.strategy"]).toBe("NODES_AND_EDGES");
  });
});
