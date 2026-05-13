import { describe, it, expect } from "vitest";
import { g12EffectiveEnabled } from "@/ui/session-settings";

describe("g12EffectiveEnabled", () => {
  it("undefined llm_settings → disabled", () => {
    expect(g12EffectiveEnabled(undefined)).toBe(false);
  });

  it("runtime_hooks_enabled=false → disabled", () => {
    expect(g12EffectiveEnabled({ runtime_hooks_enabled: false } as never)).toBe(false);
  });

  it("runtime_hooks_enabled=true, no per_hook → enabled", () => {
    expect(g12EffectiveEnabled({ runtime_hooks_enabled: true } as never)).toBe(true);
  });

  it("per_hook.cross_implications=true overrides runtime=false", () => {
    expect(
      g12EffectiveEnabled({
        runtime_hooks_enabled: false,
        per_hook_enabled: { cross_implications: true },
      } as never),
    ).toBe(true);
  });

  it("per_hook.cross_implications=false overrides runtime=true", () => {
    expect(
      g12EffectiveEnabled({
        runtime_hooks_enabled: true,
        per_hook_enabled: { cross_implications: false },
      } as never),
    ).toBe(false);
  });
});
