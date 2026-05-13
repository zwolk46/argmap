// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { OrphanCandidateRow } from "@/ui/session-migration/orphan-candidate-row";
import type { OrphanCandidate } from "@/state";

function candidate(overrides: Partial<OrphanCandidate> = {}): OrphanCandidate {
  return {
    carrier_kind: "argument_edge",
    carrier_id: "c1",
    display_summary: "edge from A to ghost",
    suggested_kind: "discard",
    ...overrides,
  };
}

describe("OrphanCandidateRow", () => {
  it("renders display_summary verbatim", () => {
    const { getByTestId } = render(
      <OrphanCandidateRow
        candidate={candidate()}
        resolution={{ kind: "discard" }}
        onResolutionChanged={() => {}}
      />,
    );
    expect(getByTestId("candidate-display-summary").textContent).toBe("edge from A to ghost");
  });

  it("switching to reattach pre-fills target_node_id from reattach_candidates[0]", () => {
    const cb = vi.fn();
    const { getByText } = render(
      <OrphanCandidateRow
        candidate={candidate({
          reattach_candidates: [
            { target_node_id: "t1", label: "Target 1" },
            { target_node_id: "t2", label: "Target 2" },
          ],
        })}
        resolution={{ kind: "discard" }}
        onResolutionChanged={cb}
      />,
    );
    fireEvent.click(getByText("Reattach"));
    expect(cb).toHaveBeenCalledWith({ kind: "reattach", target_node_id: "t1" });
  });

  it("switching from reattach to discard drops target_node_id", () => {
    const cb = vi.fn();
    const { getByText } = render(
      <OrphanCandidateRow
        candidate={candidate({
          reattach_candidates: [{ target_node_id: "t1", label: "T1" }],
        })}
        resolution={{ kind: "reattach", target_node_id: "t1" }}
        onResolutionChanged={cb}
      />,
    );
    fireEvent.click(getByText("Discard"));
    expect(cb).toHaveBeenCalledWith({ kind: "discard" });
  });

  it("shows alternative-target select only when there are 2+ reattach candidates", () => {
    const { queryByTestId } = render(
      <OrphanCandidateRow
        candidate={candidate({
          reattach_candidates: [{ target_node_id: "t1", label: "T1" }],
        })}
        resolution={{ kind: "reattach", target_node_id: "t1" }}
        onResolutionChanged={() => {}}
      />,
    );
    expect(queryByTestId("reattach-target-select")).toBeNull();
  });
});
