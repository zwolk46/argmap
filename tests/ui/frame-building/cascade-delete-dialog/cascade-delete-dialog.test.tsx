// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type { CascadeReport } from "@/state";

const MOCK_REPORT: CascadeReport = {
  cascade_nodes: [
    { node_id: "n1", reason: { kind: "explicitly_requested" as const } },
    { node_id: "n2", reason: { kind: "orphaned_by_node" as const, cause_node_id: "n1" } },
  ],
  cascade_edges: [{ edge_id: "e1", reason: { kind: "explicitly_requested" as const } }],
};

// Mutable state for the hook mock
let mockPhase: "idle" | "confirming" = "idle";

vi.mock("@/ui/hooks/use-cascade-confirmation", () => ({
  useCascadeConfirmation: () => ({
    phase: mockPhase,
    summary: mockPhase === "confirming" ? MOCK_REPORT : null,
    node_id: mockPhase === "confirming" ? "n1" : null,
    request: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn(),
  }),
}));

import { CascadeDeleteDialog } from "@/ui/frame-building/cascade-delete-dialog/cascade-delete-dialog";

describe("CascadeDeleteDialog", () => {
  it("renders nothing (null) when phase === 'idle'", () => {
    mockPhase = "idle";
    const { container } = render(<CascadeDeleteDialog />);
    expect(container.firstChild).toBeNull();
  });

  it("renders dialog content when phase === 'confirming'", () => {
    mockPhase = "confirming";
    const { getByText } = render(<CascadeDeleteDialog />);
    // The dialog title should be present
    expect(getByText("Delete and cascade?")).toBeTruthy();
  });

  it("shows the node and edge counts in the confirm button label when confirming", () => {
    mockPhase = "confirming";
    const { getByText } = render(<CascadeDeleteDialog />);
    // n_nodes=2, n_edges=1
    expect(getByText(/Delete 2 nodes and 1 edge/)).toBeTruthy();
  });

  it("renders CascadeSummaryTree content when confirming", () => {
    mockPhase = "confirming";
    const { getByText } = render(<CascadeDeleteDialog />);
    expect(getByText(/The following nodes and edges will be permanently removed/)).toBeTruthy();
  });
});
