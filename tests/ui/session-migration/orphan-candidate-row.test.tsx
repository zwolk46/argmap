// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { OrphanCandidateRow } from "@/ui/session-migration/orphan-candidate-row";
import type { OrphanCandidate } from "@/state";

function candidate(overrides: Partial<OrphanCandidate> = {}): OrphanCandidate {
  return {
    carrier_kind: "argument_edge",
    carrier_id: "c1",
    source_node_id: "n-ghost",
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
        resolution={{ kind: "discard", source_node_id: "n-ghost" }}
        onResolutionChanged={() => {}}
      />,
    );
    expect(getByTestId("candidate-display-summary").textContent).toBe("edge from A to ghost");
  });

  it("switching to reattach pre-fills target_node_id AND carries source_node_id (P0-6)", () => {
    const cb = vi.fn();
    const { getByTestId } = render(
      <OrphanCandidateRow
        candidate={candidate({
          reattach_candidates: [
            { target_node_id: "t1", label: "Target 1" },
            { target_node_id: "t2", label: "Target 2" },
          ],
        })}
        resolution={{ kind: "discard", source_node_id: "n-ghost" }}
        onResolutionChanged={cb}
      />,
    );
    // shadcn DropdownMenu (Radix) opens on pointerdown button=0, not click.
    // Menu items are portaled to document.body, so use screen.*.
    fireEvent.pointerDown(getByTestId("resolution-picker-trigger"), { button: 0 });
    fireEvent.click(screen.getByTestId("resolution-option-reattach"));
    expect(cb).toHaveBeenCalledWith({
      kind: "reattach",
      source_node_id: "n-ghost",
      target_node_id: "t1",
    });
  });

  it("switching from reattach to discard drops target_node_id but preserves source_node_id", () => {
    const cb = vi.fn();
    const { getByTestId } = render(
      <OrphanCandidateRow
        candidate={candidate({
          reattach_candidates: [{ target_node_id: "t1", label: "T1" }],
        })}
        resolution={{ kind: "reattach", source_node_id: "n-ghost", target_node_id: "t1" }}
        onResolutionChanged={cb}
      />,
    );
    fireEvent.pointerDown(getByTestId("resolution-picker-trigger"), { button: 0 });
    fireEvent.click(screen.getByTestId("resolution-option-discard"));
    expect(cb).toHaveBeenCalledWith({ kind: "discard", source_node_id: "n-ghost" });
  });

  it("changing the reattach target via the select preserves source_node_id", () => {
    const cb = vi.fn();
    const { getByTestId } = render(
      <OrphanCandidateRow
        candidate={candidate({
          reattach_candidates: [
            { target_node_id: "t1", label: "T1" },
            { target_node_id: "t2", label: "T2" },
          ],
        })}
        resolution={{ kind: "reattach", source_node_id: "n-ghost", target_node_id: "t1" }}
        onResolutionChanged={cb}
      />,
    );
    fireEvent.change(getByTestId("reattach-target-select"), { target: { value: "t2" } });
    expect(cb).toHaveBeenCalledWith({
      kind: "reattach",
      source_node_id: "n-ghost",
      target_node_id: "t2",
    });
  });

  it("shows alternative-target select only when there are 2+ reattach candidates", () => {
    const { queryByTestId } = render(
      <OrphanCandidateRow
        candidate={candidate({
          reattach_candidates: [{ target_node_id: "t1", label: "T1" }],
        })}
        resolution={{ kind: "reattach", source_node_id: "n-ghost", target_node_id: "t1" }}
        onResolutionChanged={() => {}}
      />,
    );
    expect(queryByTestId("reattach-target-select")).toBeNull();
  });
});
