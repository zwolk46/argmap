import { describe, it, expect } from "vitest";
import type { HookInvocationRecord } from "@/llm-hooks";
import { fieldAttributionPath } from "@/ui/frame-building/right-pane/use-field-attribution";

function makeRecord(
  id: string,
  decision: "accepted" | "edited" | "rejected",
  target_node_ids?: string[],
  target_field_paths?: string[],
): HookInvocationRecord {
  return {
    id,
    hook_id: "g1-checkpoint-question" as HookInvocationRecord["hook_id"],
    prompt_name: "test-prompt",
    prompt_version: "1.0",
    provider_id: "mock",
    model_id: "test-model",
    input_hash: "abc123",
    decision,
    target_node_ids,
    target_field_paths,
    invoked_at: "2026-01-01T00:00:00Z",
  };
}

describe("fieldAttributionPath", () => {
  it("returns null for empty invocations array", () => {
    expect(fieldAttributionPath([], "n1", "statement")).toBeNull();
  });

  it("returns null when no record matches node_id", () => {
    const records = [makeRecord("r1", "accepted", ["other-node"], ["statement"])];
    expect(fieldAttributionPath(records, "n1", "statement")).toBeNull();
  });

  it("returns null when no record matches field_path", () => {
    const records = [makeRecord("r1", "accepted", ["n1"], ["notes"])];
    expect(fieldAttributionPath(records, "n1", "statement")).toBeNull();
  });

  it("returns null when decision is rejected", () => {
    const records = [makeRecord("r1", "rejected", ["n1"], ["statement"])];
    expect(fieldAttributionPath(records, "n1", "statement")).toBeNull();
  });

  it("returns a matching record with decision 'accepted'", () => {
    const rec = makeRecord("r1", "accepted", ["n1"], ["statement"]);
    const result = fieldAttributionPath([rec], "n1", "statement");
    expect(result).toBe(rec);
  });

  it("returns a matching record with decision 'edited'", () => {
    const rec = makeRecord("r1", "edited", ["n1"], ["statement"]);
    const result = fieldAttributionPath([rec], "n1", "statement");
    expect(result).toBe(rec);
  });

  it("returns the most recent matching record (last in array that matches)", () => {
    const rec1 = makeRecord("r1", "accepted", ["n1"], ["statement"]);
    const rec2 = makeRecord("r2", "accepted", ["n1"], ["statement"]);
    // fieldAttributionPath iterates from end, so rec2 (last) should be returned
    const result = fieldAttributionPath([rec1, rec2], "n1", "statement");
    expect(result).toBe(rec2);
  });

  it("skips non-matching records and returns correct one", () => {
    const rec1 = makeRecord("r1", "accepted", ["n1"], ["notes"]);
    const rec2 = makeRecord("r2", "rejected", ["n1"], ["statement"]);
    const rec3 = makeRecord("r3", "edited", ["n1"], ["statement"]);
    const result = fieldAttributionPath([rec1, rec2, rec3], "n1", "statement");
    expect(result).toBe(rec3);
  });

  it("returns null when target_node_ids is undefined", () => {
    const records = [makeRecord("r1", "accepted", undefined, ["statement"])];
    expect(fieldAttributionPath(records, "n1", "statement")).toBeNull();
  });

  it("returns null when target_field_paths is undefined", () => {
    const records = [makeRecord("r1", "accepted", ["n1"], undefined)];
    expect(fieldAttributionPath(records, "n1", "statement")).toBeNull();
  });
});
