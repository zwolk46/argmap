import { describe, it, expect } from "vitest";
import { ALL_HOOKS } from "@/llm-hooks/hooks";

describe("HookContract conformance", () => {
  it("every hook has a unique id", () => {
    const ids = ALL_HOOKS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every hook's activation is in the closed enum", () => {
    for (const h of ALL_HOOKS) {
      expect(["build_time", "output_time", "runtime_sidecar"]).toContain(h.activation);
    }
  });

  it("every hook's trigger is in the closed enum", () => {
    for (const h of ALL_HOOKS) {
      expect(["manual", "automatic", "manual_with_auto_offer"]).toContain(h.trigger);
    }
  });

  it("every hook declares at least one visible (mode, flavor) combination", () => {
    for (const h of ALL_HOOKS) {
      const v = h.mode_visibility;
      expect(v.legal || v.general.personal || v.general.academic).toBe(true);
    }
  });

  it("every hook has a non-empty name", () => {
    for (const h of ALL_HOOKS) {
      expect(typeof h.name).toBe("string");
      expect(h.name.length).toBeGreaterThan(0);
    }
  });

  it("13 hooks total", () => {
    expect(ALL_HOOKS).toHaveLength(13);
  });
});
