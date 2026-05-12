import { describe, it, expect, vi } from "vitest";
import { g9Hook } from "@/llm-hooks/hooks/g9-position-table";
import type { HookContext } from "@/llm-hooks";
import type { Repository } from "@/persistence";

const stubRepo = (): Repository =>
  ({
    loadPrompt: vi.fn().mockResolvedValue(null),
    savePrompt: vi.fn().mockResolvedValue(undefined),
  }) as unknown as Repository;

const makeCtx = (overrides?: Partial<HookContext>): HookContext => ({
  repository: stubRepo(),
  frame_version: {
    id: "fv1",
    frame_id: "f1",
    version_number: 1,
    created_at: "T",
    nodes: [
      {
        id: "rq1",
        type: "RootQuestion",
        statement: "Is capital punishment just?",
        flavor: "academic",
      } as never,
    ],
    edges: [],
    is_milestone: false,
  },
  ...overrides,
});

describe("g9Hook — position_table_suggestion", () => {
  it("buildInput includes topic from RootQuestion", () => {
    const input = g9Hook.buildInput(makeCtx());
    expect(input.topic).toBe("Is capital punishment just?");
  });

  it("buildInput defaults frame_flavor to academic", () => {
    const input = g9Hook.buildInput(makeCtx());
    expect(input.frame_flavor).toBe("academic");
  });

  it("buildInput uses frame flavor when available", () => {
    const ctx = makeCtx({
      frame: {
        id: "f1",
        title: "T",
        mode: "general",
        flavor: "personal",
        created_at: "T",
        updated_at: "T",
        current_version_id: "fv1",
        default_satisfaction_policies: {},
        tags: [],
        pinned: false,
      } as never,
    });
    expect(g9Hook.buildInput(ctx).frame_flavor).toBe("personal");
  });

  it("parseOutput returns ok for valid positions array", () => {
    const raw = JSON.stringify({
      positions: [{ label: "Abolitionist" }, { label: "Retentionist" }],
    });
    const result = g9Hook.parseOutput(raw, {});
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.value.positions).toHaveLength(2);
  });

  it("parseOutput rejects non-array positions", () => {
    expect(g9Hook.parseOutput(JSON.stringify({ positions: "oops" }), {}).kind).toBe("parse_error");
  });

  it("parseOutput rejects non-JSON", () => {
    expect(g9Hook.parseOutput("bad", {}).kind).toBe("parse_error");
  });

  it("fallback returns advise_user", () => {
    const r = g9Hook.fallback(g9Hook.buildInput(makeCtx()), {
      kind: "parse_error",
      name: "P",
      message: "m",
      raw: "",
    } as never);
    expect(r.kind).toBe("advise_user");
  });

  it("commit creates append writes per position", () => {
    const plan = g9Hook.commit({ positions: [{ label: "Pro" }, { label: "Con" }] }, makeCtx());
    expect(plan.versioned).toBe(true);
    expect(plan.writes).toHaveLength(2);
    expect(plan.writes.every((w) => w.op === "append")).toBe(true);
  });
});
