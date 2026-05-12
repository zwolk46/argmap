import { describe, it, expect, vi } from "vitest";
import { g13Hook } from "@/llm-hooks/hooks/g13-change-summary";
import type { HookContext } from "@/llm-hooks";
import type { Repository } from "@/persistence";
import type { StructuralDiff } from "@/persistence";

const stubRepo = (): Repository =>
  ({
    loadPrompt: vi.fn().mockResolvedValue(null),
    savePrompt: vi.fn().mockResolvedValue(undefined),
  }) as unknown as Repository;

const emptyDiff = (): StructuralDiff => ({
  nodes: { added: [], removed: [], edited: [] },
  edges: { added: [], removed: [], edited: [] },
  metadata: { changed_fields: [] },
  layout_only: false,
  layout_changed_count: 0,
});

const makeCtx = (overrides?: Partial<HookContext>): HookContext => ({
  repository: stubRepo(),
  frame_version: {
    id: "fv1",
    frame_id: "f1",
    version_number: 1,
    created_at: "T",
    nodes: [],
    edges: [],
    is_milestone: false,
  },
  ...overrides,
});

describe("g13Hook — version_change_summary", () => {
  it("buildInput returns an empty diff by default", () => {
    const input = g13Hook.buildInput(makeCtx());
    expect(input.diff.nodes.added).toHaveLength(0);
  });

  it("parseOutput returns ok for short valid summary", () => {
    const raw = JSON.stringify({ change_summary: "Added two checkpoint nodes." });
    const result = g13Hook.parseOutput(raw, {});
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.value.change_summary).toContain("checkpoint");
  });

  it("parseOutput rejects empty change_summary", () => {
    expect(g13Hook.parseOutput(JSON.stringify({ change_summary: "" }), {}).kind).toBe(
      "parse_error",
    );
  });

  it("parseOutput rejects summaries >= 30 words", () => {
    const longSummary = Array.from({ length: 30 }, (_, i) => `word${i}`).join(" ");
    expect(g13Hook.parseOutput(JSON.stringify({ change_summary: longSummary }), {}).kind).toBe(
      "parse_error",
    );
  });

  it("parseOutput rejects non-JSON", () => {
    expect(g13Hook.parseOutput("{bad}", {}).kind).toBe("parse_error");
  });

  it("fallback on empty diff returns 'Minor edits.'", () => {
    const dummyErr = { kind: "parse_error" as const, name: "P", message: "m", raw: "" } as never;
    const result = g13Hook.fallback({ diff: emptyDiff(), frame_mode: "general" }, dummyErr);
    expect(result.kind).toBe("deterministic_fallback");
    if (result.kind === "deterministic_fallback") {
      expect(result.value.change_summary).toBe("Minor edits.");
    }
  });

  it("fallback lists counts of added/removed nodes and edges", () => {
    const diff = emptyDiff();
    diff.nodes.added = [{ id: "n1" } as never];
    diff.edges.removed = [{ id: "e1" } as never, { id: "e2" } as never];
    const dummyErr = { kind: "parse_error" as const, name: "P", message: "m", raw: "" } as never;
    const result = g13Hook.fallback({ diff, frame_mode: "general" }, dummyErr);
    if (result.kind === "deterministic_fallback") {
      expect(result.value.change_summary).toContain("added 1 node");
      expect(result.value.change_summary).toContain("removed 2 edges");
    }
  });

  it("commit writes change_summary field", () => {
    const plan = g13Hook.commit({ change_summary: "Added a checkpoint." }, makeCtx());
    expect(plan.versioned).toBe(true);
    expect(plan.writes[0]?.field_path).toBe("change_summary");
  });
});
