import { describe, it, expect } from "vitest";
import { canonicalize, hashCanonical, buildInvocationRecord } from "@/llm-hooks";
import type { SuggestionResult, ConfirmationDecision, CommitPlan } from "@/llm-hooks";

describe("canonicalize", () => {
  it("orders object keys lexicographically at every depth", () => {
    const a = canonicalize({ z: 1, a: { y: 2, b: 3 } });
    const b = canonicalize({ a: { b: 3, y: 2 }, z: 1 });
    expect(a).toBe(b);
  });

  it("preserves array order", () => {
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]");
  });

  it("rejects non-finite numbers", () => {
    expect(() => canonicalize({ x: NaN })).toThrow();
    expect(() => canonicalize({ x: Infinity })).toThrow();
  });

  it("drops undefined values", () => {
    const result = canonicalize({ a: 1, b: undefined });
    const parsed = JSON.parse(result) as Record<string, unknown>;
    expect("b" in parsed).toBe(false);
  });
});

describe("hashCanonical", () => {
  it("returns a 64-char lowercase hex string", async () => {
    const hash = await hashCanonical('{"x":1}');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is stable across calls", async () => {
    const a = await hashCanonical('{"x":1}');
    const b = await hashCanonical('{"x":1}');
    expect(a).toBe(b);
  });

  it("differs for different inputs", async () => {
    const a = await hashCanonical('{"x":1}');
    const b = await hashCanonical('{"x":2}');
    expect(a).not.toBe(b);
  });
});

describe("buildInvocationRecord", () => {
  it("produces a stable record under frozen-clock + fixed-id deps", () => {
    const deps = { now: () => "2026-01-01T00:00:00Z", generateId: () => "fixed-id" };
    const suggestion: SuggestionResult<unknown> = {
      hook_id: "G1",
      prompt_name: "n",
      prompt_version: "v1",
      provider_id: "mock",
      model_id: "m",
      input_hash: "h",
      raw_response: "r",
      parsed: {},
      parse_status: "ok",
      generated_at: "2026-01-01T00:00:00Z",
    };
    const decision: ConfirmationDecision<unknown> = { kind: "accepted", final: {} };
    const plan: CommitPlan = { writes: [], versioned: false };
    const rec = buildInvocationRecord(
      { suggestion, decision, commit_plan: plan, committed: true },
      deps,
    );
    expect(rec.id).toBe("fixed-id");
    expect(rec.decision).toBe("accepted");
    expect(rec.committed_at).toBe("2026-01-01T00:00:00Z");
  });

  it("sets committed_at to undefined on rejection", () => {
    const deps = { now: () => "2026-01-01T00:00:00Z", generateId: () => "x" };
    const suggestion: SuggestionResult<unknown> = {
      hook_id: "G1",
      prompt_name: "n",
      prompt_version: "v1",
      provider_id: "mock",
      model_id: "m",
      input_hash: "h",
      raw_response: "r",
      parsed: {},
      parse_status: "ok",
      generated_at: "2026-01-01T00:00:00Z",
    };
    const rec = buildInvocationRecord(
      {
        suggestion,
        decision: { kind: "rejected" },
        commit_plan: { writes: [], versioned: false },
        committed: false,
      },
      deps,
    );
    expect(rec.committed_at).toBeUndefined();
    expect(rec.decision).toBe("rejected");
  });

  it("collects and sorts target_node_ids and target_field_paths", () => {
    const deps = { now: () => "T", generateId: () => "id" };
    const suggestion: SuggestionResult<unknown> = {
      hook_id: "G1",
      prompt_name: "n",
      prompt_version: "v1",
      provider_id: "p",
      model_id: "m",
      input_hash: "h",
      raw_response: "r",
      parsed: {},
      parse_status: "ok",
      generated_at: "T",
    };
    const plan: CommitPlan = {
      writes: [
        { target_node_id: "z", field_path: "q", op: "set", value: 1 },
        { target_node_id: "a", field_path: "x", op: "set", value: 2 },
      ],
      versioned: true,
    };
    const rec = buildInvocationRecord(
      { suggestion, decision: { kind: "accepted", final: {} }, commit_plan: plan, committed: true },
      deps,
    );
    expect(rec.target_node_ids).toEqual(["a", "z"]);
    expect(rec.target_field_paths).toEqual(["a:x", "z:q"]);
  });
});
