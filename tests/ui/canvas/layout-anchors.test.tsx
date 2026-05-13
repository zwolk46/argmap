// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import * as React from "react";
import { FrameCanvas } from "@/ui/canvas";
import type { FrameVersion, Node } from "@/schema";

/**
 * P0-10 regression: a node carrying presentation.x/y must render at those
 * coordinates regardless of what layout_result.positions says. Before this
 * fix, the controlled `nodes` prop on React Flow used only the layout
 * result, so a freshly-dragged node's patch landed in the store but the
 * next render trampled the new position.
 *
 * P0-9 regression: when layout is computing (or fails), the canvas should
 * still render at the prior positions, not (0,0).
 */

function makeNode(id: string, x?: number, y?: number): Node {
  return {
    id,
    type: "RootQuestion",
    layer: "frame",
    statement: id,
    created_at: "2026-05-13T00:00:00.000Z",
    updated_at: "2026-05-13T00:00:00.000Z",
    ...(x !== undefined || y !== undefined
      ? { presentation: { x, y } }
      : {}),
  };
}

function makeFv(nodes: Node[]): FrameVersion {
  return {
    id: "fv-1",
    frame_id: "fr-1",
    version_number: 1,
    created_at: "2026-05-13T00:00:00.000Z",
    is_milestone: false,
    nodes,
    edges: [],
  };
}

describe("FrameCanvas anchored-position contract (P0-10 + P0-9)", () => {
  it("renders an anchored node at its presentation.x/y when the layout_result places it elsewhere", () => {
    const fv = makeFv([makeNode("n1", 500, 300)]);
    const { container } = render(
      <FrameCanvas
        frame_version={fv}
        layout_result={{
          // Layout says (0,0) for n1; the anchor must win.
          positions: [{ node_id: "n1", x: 0, y: 0 }],
          collapsed_nodes: [],
        }}
        operating_mode="frame_building"
        legal_mode={false}
      />,
    );
    const node = container.querySelector('.react-flow__node[data-id="n1"]') as HTMLElement | null;
    expect(node).toBeTruthy();
    const transform = node!.style.transform;
    // React Flow uses translate(...) for positioning. The numeric values
    // must reflect the anchor (500, 300), not the layout's (0, 0).
    expect(transform).toMatch(/500/);
    expect(transform).toMatch(/300/);
  });

  it("renders an anchored node correctly when layout_result is null (P0-9: no layout yet)", () => {
    const fv = makeFv([makeNode("n1", 100, 200)]);
    const { container } = render(
      <FrameCanvas
        frame_version={fv}
        layout_result={null}
        operating_mode="frame_building"
        legal_mode={false}
      />,
    );
    const node = container.querySelector('.react-flow__node[data-id="n1"]') as HTMLElement | null;
    expect(node).toBeTruthy();
    const transform = node!.style.transform;
    expect(transform).toMatch(/100/);
    expect(transform).toMatch(/200/);
  });

  it("non-anchored nodes still fall through to (0,0) when layout_result is null and no presentation is set", () => {
    const fv = makeFv([makeNode("n1")]);
    const { container } = render(
      <FrameCanvas
        frame_version={fv}
        layout_result={null}
        operating_mode="frame_building"
        legal_mode={false}
      />,
    );
    const node = container.querySelector('.react-flow__node[data-id="n1"]');
    expect(node).toBeTruthy();
  });
});
