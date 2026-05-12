import { describe, it, expect, vi } from "vitest";
import { g11Hook } from "@/llm-hooks/hooks/g11-premise-drafting";
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
    nodes: [{ id: "cp1", type: "Checkpoint", question: "Was there intent to deceive?" } as never],
    edges: [],
    is_milestone: false,
  },
  selection: "cp1" as never,
  user_input: "The defendant sent false invoices to three clients.",
  ...overrides,
});

describe("g11Hook — premise_drafting_from_fact_pattern", () => {
  it("buildInput uses user_input as fact_pattern_text", () => {
    const input = g11Hook.buildInput(makeCtx());
    expect(input.fact_pattern_text).toBe("The defendant sent false invoices to three clients.");
  });

  it("buildInput captures checkpoint question", () => {
    const input = g11Hook.buildInput(makeCtx());
    expect(input.target_checkpoint.question).toBe("Was there intent to deceive?");
  });

  it("parseOutput returns ok for valid draft_premises", () => {
    const raw = JSON.stringify({
      draft_premises: [
        { statement: "Defendant sent false invoices.", kind: "factual" },
        { statement: "Recipients relied on accuracy.", kind: "factual" },
      ],
    });
    const result = g11Hook.parseOutput(raw, {});
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.value.draft_premises).toHaveLength(2);
  });

  it("parseOutput rejects non-array draft_premises", () => {
    expect(g11Hook.parseOutput(JSON.stringify({ draft_premises: "x" }), {}).kind).toBe(
      "parse_error",
    );
  });

  it("parseOutput rejects non-JSON", () => {
    expect(g11Hook.parseOutput("{oops}", {}).kind).toBe("parse_error");
  });

  it("fallback returns advise_user", () => {
    const r = g11Hook.fallback(g11Hook.buildInput(makeCtx()), {
      kind: "parse_error",
      name: "P",
      message: "m",
      raw: "",
    } as never);
    expect(r.kind).toBe("advise_user");
  });

  it("commit creates one write per draft premise", () => {
    const plan = g11Hook.commit(
      {
        draft_premises: [
          { statement: "S1", kind: "factual" },
          { statement: "S2", kind: "legal" },
        ],
      },
      makeCtx(),
    );
    expect(plan.versioned).toBe(true);
    expect(plan.writes).toHaveLength(2);
    expect(plan.writes.every((w) => w.op === "create_node")).toBe(true);
  });
});
