import { describe, it, expect, vi } from "vitest";
import { g2Hook } from "@/llm-hooks/hooks/g2-interpretation-suggestion";
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
        statement: "Is X constitutional?",
        flavor: "academic",
      } as never,
    ],
    edges: [],
    is_milestone: false,
  },
  ...overrides,
});

describe("g2Hook — interpretation_suggestion", () => {
  it("buildInput includes root question statement", () => {
    const input = g2Hook.buildInput(makeCtx({ selection: "term-1" as never }));
    expect(input.root_question.statement).toBe("Is X constitutional?");
  });

  it("buildInput falls back to general mode when frame is absent", () => {
    const input = g2Hook.buildInput(makeCtx());
    expect(input.frame_mode).toBe("general");
  });

  it("parseOutput returns ok on valid response", () => {
    const raw = JSON.stringify({
      interpretations: [{ statement: "X means Y", rationale: "because..." }],
    });
    const result = g2Hook.parseOutput(raw, {});
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.value.interpretations).toHaveLength(1);
    }
  });

  it("parseOutput rejects empty interpretations array", () => {
    const result = g2Hook.parseOutput(JSON.stringify({ interpretations: [] }), {});
    expect(result.kind).toBe("parse_error");
  });

  it("parseOutput rejects non-JSON", () => {
    expect(g2Hook.parseOutput("not json", {}).kind).toBe("parse_error");
  });

  it("fallback returns advise_user", () => {
    const r = g2Hook.fallback(g2Hook.buildInput(makeCtx()), {
      kind: "parse_error",
      name: "P",
      message: "m",
      raw: "",
    } as never);
    expect(r.kind).toBe("advise_user");
  });

  it("commit creates interpretation nodes and edges", () => {
    const ctx = makeCtx({ selection: "term-1" as never });
    const plan = g2Hook.commit({ interpretations: [{ statement: "X means Y" }] }, ctx);
    expect(plan.versioned).toBe(true);
    expect(plan.writes.length).toBeGreaterThanOrEqual(2);
    expect(plan.writes.some((w) => w.op === "create_node")).toBe(true);
    expect(plan.writes.some((w) => w.op === "create_edge")).toBe(true);
  });

  it("commit adds Authority node in legal mode with citation_hint", () => {
    const ctx = makeCtx({
      selection: "term-1" as never,
      frame: {
        id: "f1",
        title: "T",
        mode: "legal",
        flavor: null,
        created_at: "T",
        updated_at: "T",
        current_version_id: "fv1",
        default_satisfaction_policies: {},
        tags: [],
        pinned: false,
      } as never,
    });
    const plan = g2Hook.commit(
      {
        interpretations: [
          {
            statement: "X",
            citation_hint: { authority_label: "SCOTUS", citation_string: "123 U.S. 456" },
          },
        ],
      },
      ctx,
    );
    expect(plan.writes.length).toBeGreaterThanOrEqual(4);
  });
});
