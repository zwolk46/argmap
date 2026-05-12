import { describe, it, expect } from "vitest";
import { ALL_HOOKS } from "@/llm-hooks/hooks";
import type { HookId } from "@/llm-hooks";

const VALID_HOOK_IDS: HookId[] = [
  "G1",
  "G2",
  "G3",
  "G4",
  "G5",
  "G6",
  "G7",
  "G8",
  "G9",
  "G10",
  "G11",
  "G12",
  "G13",
];
const VALID_ACTIVATIONS = ["build_time", "runtime_sidecar", "output_time"];
const VALID_TRIGGERS = ["manual", "automatic", "manual_with_auto_offer"];

describe("schema-conformance: all hooks satisfy HookContract shape", () => {
  for (const hook of ALL_HOOKS) {
    describe(`${hook.id} (${hook.name})`, () => {
      it("has a valid id", () => {
        expect(VALID_HOOK_IDS).toContain(hook.id);
      });

      it("has a non-empty name (snake_case)", () => {
        expect(typeof hook.name).toBe("string");
        expect(hook.name.length).toBeGreaterThan(0);
        expect(hook.name).toMatch(/^[a-z_]+$/);
      });

      it("has a valid activation", () => {
        expect(VALID_ACTIVATIONS).toContain(hook.activation);
      });

      it("has a valid trigger", () => {
        expect(VALID_TRIGGERS).toContain(hook.trigger);
      });

      it("has mode_visibility with legal bool and general object", () => {
        expect(typeof hook.mode_visibility.legal).toBe("boolean");
        expect(typeof hook.mode_visibility.general.personal).toBe("boolean");
        expect(typeof hook.mode_visibility.general.academic).toBe("boolean");
      });

      it("has buildInput function", () => {
        expect(typeof hook.buildInput).toBe("function");
      });

      it("has renderPrompt function", () => {
        expect(typeof hook.renderPrompt).toBe("function");
      });

      it("has parseOutput function", () => {
        expect(typeof hook.parseOutput).toBe("function");
      });

      it("has fallback function", () => {
        expect(typeof hook.fallback).toBe("function");
      });

      it("has commit function", () => {
        expect(typeof hook.commit).toBe("function");
      });
    });
  }

  it("exactly 13 hooks are registered", () => {
    expect(ALL_HOOKS).toHaveLength(13);
  });

  it("all hook ids are unique", () => {
    const ids = ALL_HOOKS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all hook names are unique", () => {
    const names = ALL_HOOKS.map((h) => h.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
