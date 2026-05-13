// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MigrationDialogBody, partitionByKind } from "@/ui/session-migration/migration-dialog-body";
import type { OrphanCandidate } from "@/state";

describe("partitionByKind", () => {
  it("buckets candidates by carrier_kind preserving order", () => {
    const candidates: OrphanCandidate[] = [
      { carrier_kind: "argument_edge", carrier_id: "ae1", display_summary: "x", suggested_kind: "discard" },
      { carrier_kind: "checkpoint_answer", carrier_id: "cp1", display_summary: "x", suggested_kind: "discard" },
      { carrier_kind: "argument_edge", carrier_id: "ae2", display_summary: "x", suggested_kind: "discard" },
    ];
    const out = partitionByKind(candidates);
    expect(out.get("argument_edge")!.map((c) => c.carrier_id)).toEqual(["ae1", "ae2"]);
    expect(out.get("checkpoint_answer")!.map((c) => c.carrier_id)).toEqual(["cp1"]);
  });
});

describe("MigrationDialogBody", () => {
  it("renders loading phase", () => {
    const { getByTestId } = render(
      <MigrationDialogBody phase={{ kind: "loading" }} onResolutionChanged={() => {}} />,
    );
    expect(getByTestId("migration-loading")).toBeTruthy();
  });

  it("renders empty phase", () => {
    const { getByTestId } = render(
      <MigrationDialogBody phase={{ kind: "loaded_empty" }} onResolutionChanged={() => {}} />,
    );
    expect(getByTestId("migration-empty")).toBeTruthy();
  });

  it("renders failed phase with Retry when callback supplied", () => {
    const { getByTestId } = render(
      <MigrationDialogBody
        phase={{ kind: "failed", error: { kind: "x", message: "boom" } }}
        onResolutionChanged={() => {}}
        onRetry={() => {}}
      />,
    );
    expect(getByTestId("migration-failed")).toBeTruthy();
    expect(getByTestId("migration-retry")).toBeTruthy();
  });

  it("renders loaded groups in canonical order, omitting empties", () => {
    const candidates: OrphanCandidate[] = [
      { carrier_kind: "argument_edge", carrier_id: "ae1", display_summary: "x", suggested_kind: "discard" },
      { carrier_kind: "checkpoint_answer", carrier_id: "cp1", display_summary: "x", suggested_kind: "discard" },
    ];
    const resolutions = new Map<string, { kind: "discard" }>([
      ["ae1", { kind: "discard" }],
      ["cp1", { kind: "discard" }],
    ]);
    const { getAllByTestId } = render(
      <MigrationDialogBody
        phase={{ kind: "loaded", candidates, resolutions }}
        onResolutionChanged={() => {}}
      />,
    );
    const groups = getAllByTestId("orphan-candidate-group");
    expect(groups.map((g) => g.getAttribute("data-carrier-kind"))).toEqual([
      "checkpoint_answer",
      "argument_edge",
    ]);
  });
});
