// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CascadeReport } from "@/state";
import { CascadeDeleteDialog } from "@/ui/frame-building/cascade-delete-dialog/cascade-delete-dialog";
import type { CascadeConfirmationState } from "@/ui/hooks/use-cascade-confirmation";

const MOCK_REPORT: CascadeReport = {
  cascade_nodes: [
    { node_id: "n1", reason: { kind: "explicitly_requested" as const } },
    { node_id: "n2", reason: { kind: "orphaned_by_node" as const, cause_node_id: "n1" } },
  ],
  cascade_edges: [{ edge_id: "e1", reason: { kind: "explicitly_requested" as const } }],
};

function makeCascade(phase: "idle" | "confirming"): CascadeConfirmationState {
  return {
    phase,
    summary: phase === "confirming" ? MOCK_REPORT : null,
    node_id: phase === "confirming" ? "n1" : null,
    request: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn(),
  };
}

describe("CascadeDeleteDialog", () => {
  it("renders nothing (null) when phase === 'idle'", () => {
    const { container } = render(<CascadeDeleteDialog cascade={makeCascade("idle")} />);
    expect(container.firstChild).toBeNull();
    // AlertDialog portals; the dialog title shouldn't appear anywhere either.
    expect(screen.queryByText("Delete and cascade?")).toBeNull();
  });

  it("renders dialog content when phase === 'confirming'", () => {
    // AlertDialog portals to document.body — query via screen, not container.
    render(<CascadeDeleteDialog cascade={makeCascade("confirming")} />);
    expect(screen.getByText("Delete and cascade?")).toBeTruthy();
  });

  it("shows the node and edge counts in the confirm button label when confirming", () => {
    render(<CascadeDeleteDialog cascade={makeCascade("confirming")} />);
    expect(screen.getByText(/Delete 2 nodes and 1 edge/)).toBeTruthy();
  });

  it("renders CascadeSummaryTree content when confirming", () => {
    render(<CascadeDeleteDialog cascade={makeCascade("confirming")} />);
    expect(
      screen.getByText(/The following nodes and edges will be permanently removed/),
    ).toBeTruthy();
  });
});
