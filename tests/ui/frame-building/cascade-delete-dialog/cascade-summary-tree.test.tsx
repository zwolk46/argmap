// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CascadeSummaryTree } from "@/ui/frame-building/cascade-delete-dialog/cascade-summary-tree";
import type { CascadeReport } from "@/state";

function makeReport(node_count: number, edge_count: number): CascadeReport {
  return {
    cascade_nodes: Array.from({ length: node_count }, (_, i) => ({
      node_id: `n${i}`,
      reason: { kind: "explicitly_requested" as const },
    })),
    cascade_edges: Array.from({ length: edge_count }, (_, i) => ({
      edge_id: `e${i}`,
      reason: { kind: "explicitly_requested" as const },
    })),
  };
}

describe("CascadeSummaryTree", () => {
  it("shows count of cascade nodes in the nodes section header", () => {
    const report = makeReport(3, 0);
    const { getByText } = render(<CascadeSummaryTree report={report} />);
    expect(getByText(/Nodes \(3\)/)).toBeTruthy();
  });

  it("shows the node IDs as rows", () => {
    const report = makeReport(2, 0);
    const { getByText } = render(<CascadeSummaryTree report={report} />);
    expect(getByText("n0")).toBeTruthy();
    expect(getByText("n1")).toBeTruthy();
  });

  it("shows edge count summary line when edges are present", () => {
    const report = makeReport(1, 3);
    const { getByText } = render(<CascadeSummaryTree report={report} />);
    expect(getByText(/3 edges will also be removed/)).toBeTruthy();
  });

  it("shows singular 'edge' form for exactly 1 edge", () => {
    const report = makeReport(1, 1);
    const { getByText } = render(<CascadeSummaryTree report={report} />);
    expect(getByText(/1 edge will also be removed/)).toBeTruthy();
  });

  it("does not show node section when no cascade nodes", () => {
    const report = makeReport(0, 2);
    const { queryByText } = render(<CascadeSummaryTree report={report} />);
    expect(queryByText(/Nodes \(/)).toBeNull();
  });

  it("does not show edge summary when no cascade edges", () => {
    const report = makeReport(2, 0);
    const { queryByText } = render(<CascadeSummaryTree report={report} />);
    expect(queryByText(/edges will also be removed/)).toBeNull();
  });

  it("renders the introductory paragraph", () => {
    const report = makeReport(1, 0);
    const { getByText } = render(<CascadeSummaryTree report={report} />);
    expect(getByText(/The following nodes and edges will be permanently removed/)).toBeTruthy();
  });
});
