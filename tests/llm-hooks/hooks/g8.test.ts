import { describe, it, expect, vi } from "vitest";
import { g8Hook } from "@/llm-hooks/hooks/g8-conclusion-direction";
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
        id: "concl1",
        type: "Conclusion",
        statement: "The statute is unconstitutional.",
        direction: null,
      } as never,
    ],
    edges: [],
    is_milestone: false,
  },
  selection: "concl1" as never,
  ...overrides,
});

describe("g8Hook — conclusion_direction_suggestion", () => {
  it("buildInput captures conclusion statement", () => {
    const input = g8Hook.buildInput(makeCtx());
    expect(input.conclusion_statement).toBe("The statute is unconstitutional.");
  });

  it("parseOutput returns ok for valid direction", () => {
    const raw = JSON.stringify({ direction: "strike", rationale: "First Amendment violation" });
    const result = g8Hook.parseOutput(raw, {});
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.value.direction).toBe("strike");
      expect(result.value.rationale).toBe("First Amendment violation");
    }
  });

  it("parseOutput rejects missing direction", () => {
    expect(g8Hook.parseOutput(JSON.stringify({ rationale: "x" }), {}).kind).toBe("parse_error");
  });

  it("parseOutput rejects non-JSON", () => {
    expect(g8Hook.parseOutput("nope", {}).kind).toBe("parse_error");
  });

  it("fallback returns advise_user", () => {
    const r = g8Hook.fallback(g8Hook.buildInput(makeCtx()), {
      kind: "parse_error",
      name: "P",
      message: "m",
      raw: "",
    } as never);
    expect(r.kind).toBe("advise_user");
  });

  it("commit writes direction to selected node", () => {
    const plan = g8Hook.commit({ direction: "strike" }, makeCtx());
    expect(plan.versioned).toBe(true);
    expect(plan.writes[0]?.field_path).toBe("direction");
    expect(plan.writes[0]?.target_node_id).toBe("concl1");
  });
});
