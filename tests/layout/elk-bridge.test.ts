import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { layout, terminate } from "@/layout/elk-bridge";
import { runLayoutSync } from "@/layout/run";
import { buildSimpleFrame } from "./_fixtures";

// ELK's internal scheduling uses setTimeout; restore real timers so it resolves.
beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  terminate();
});

describe("layout/elk-bridge", () => {
  it("layout() returns the same LayoutResult as runLayoutSync (fallback path in node)", async () => {
    const frame = buildSimpleFrame();
    const a = await layout(frame, undefined, { now: () => "frozen" });
    const b = await runLayoutSync(frame, undefined, { now: () => "frozen" });
    expect(a).toEqual(b);
  });

  it("reads deps.now() exactly once on the main thread", async () => {
    const frame = buildSimpleFrame();
    let calls = 0;
    const now = () => {
      calls++;
      return "frozen";
    };
    await layout(frame, undefined, { now });
    expect(calls).toBe(1);
  });

  it("two concurrent layout() calls each receive their own result", async () => {
    const frame = buildSimpleFrame();
    const deps = { now: () => "frozen" };
    const [a, b] = await Promise.all([
      layout(frame, undefined, deps),
      layout(frame, undefined, deps),
    ]);
    expect(a).toEqual(b);
  });

  it("uses wall-clock when deps is omitted", async () => {
    const frame = buildSimpleFrame();
    const out = await layout(frame);
    expect(out.computed_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
  });
});
