import { describe, it, expect, beforeEach, vi } from "vitest";
import { runLayoutSync } from "@/layout/run";
import { buildSimpleFrame, buildLargerFrame } from "./_fixtures";

// ELK's internal scheduling uses setTimeout; restore real timers so it resolves.
beforeEach(() => {
  vi.useRealTimers();
});

describe("layout/run", () => {
  it("produces a LayoutResult with positions for every visible node", async () => {
    const frame = buildSimpleFrame();
    const out = await runLayoutSync(frame, undefined, { now: () => "frozen" });
    expect(out.positions).toHaveLength(5);
    expect(out.computed_at).toBe("frozen");
  });

  it("emits positions sorted by node_id", async () => {
    const frame = buildSimpleFrame();
    const out = await runLayoutSync(frame, undefined, { now: () => "frozen" });
    const ids = out.positions.map((p) => p.node_id);
    expect(ids).toEqual([...ids].sort());
  });

  it("produces byte-identical results for two invocations with identical inputs", async () => {
    const frame = buildSimpleFrame();
    const deps = { now: () => "frozen" };
    const out1 = await runLayoutSync(frame, undefined, deps);
    const out2 = await runLayoutSync(frame, undefined, deps);
    expect(out2).toEqual(out1);
  });

  it("produces identical results regardless of input node/edge order", async () => {
    const frame = buildSimpleFrame();
    const shuffled = {
      ...frame,
      nodes: [...frame.nodes].reverse(),
      edges: [...frame.edges].reverse(),
    };
    const deps = { now: () => "frozen" };
    const out1 = await runLayoutSync(frame, undefined, deps);
    const out2 = await runLayoutSync(shuffled, undefined, deps);
    expect(out2).toEqual(out1);
  });

  it("respects honor_user_anchors:true — anchored nodes appear at their anchor", async () => {
    const frame = buildSimpleFrame({ anchorRoot: { x: 100, y: 200 } });
    const out = await runLayoutSync(frame, { honor_user_anchors: true }, { now: () => "frozen" });
    const root = out.positions.find((p) => p.node_id === "root_q")!;
    expect(root.x).toBe(100);
    expect(root.y).toBe(200);
  });

  it("ignores anchors when honor_user_anchors:false", async () => {
    const frame = buildSimpleFrame({ anchorRoot: { x: 100, y: 200 } });
    const out = await runLayoutSync(frame, { honor_user_anchors: false }, { now: () => "frozen" });
    const root = out.positions.find((p) => p.node_id === "root_q")!;
    expect(root.x === 100 && root.y === 200).toBe(false);
  });

  it("lays out a 20-node frame in well under 500 ms (generous CI bound)", async () => {
    const frame = buildLargerFrame(20);
    const t0 = Date.now();
    await runLayoutSync(frame, undefined, { now: () => "frozen" });
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(500);
  });

  it("matches snapshot for the simple-frame fixture", async () => {
    const frame = buildSimpleFrame();
    const out = await runLayoutSync(frame, undefined, { now: () => "2026-05-11T00:00:00.000Z" });
    expect(out).toMatchSnapshot();
  });
});
