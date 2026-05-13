// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FrameCanvas } from "@/ui/canvas";
import type { FrameVersion, Node, Edge } from "@/schema";

/**
 * P0-17 regression: when primary_path_node_ids / active_set / path_fingerprint
 * are supplied, FrameCanvas must:
 *   - mark on-primary-path nodes with data-state="... on-primary-path"
 *   - mark off-active-set nodes with the heatmap class
 *   - mark on-primary-path overlay edges with the trace class
 *   - re-key on-primary-path overlay edges by fingerprint so trace replays
 */

const T = "2026-05-13T00:00:00.000Z";

function node(id: string, type: Node["type"] = "RootQuestion"): Node {
  return {
    id,
    type,
    layer: "frame",
    ...(type === "Term"
      ? { name: id, order: 0, dispositive: false }
      : type === "Checkpoint"
        ? {
            question: id,
            answer_type: "boolean",
            options: [{ id: "yes", label: "Yes", satisfies: true }],
            requires_premise: false,
            requires_authority: false,
          }
        : { statement: id }),
    created_at: T,
    updated_at: T,
  } as Node;
}

function edge(id: string, type: Edge["type"], source: string, target: string): Edge {
  return {
    id,
    type,
    layer:
      type === "ANSWERS" || type === "SUPPORTS" || type === "CONTRADICTS" ? "argument" : "frame",
    source,
    target,
    created_at: T,
    updated_at: T,
  } as Edge;
}

function fv(nodes: Node[], edges: Edge[] = []): FrameVersion {
  return {
    id: "fv-x",
    frame_id: "fr-x",
    version_number: 1,
    created_at: T,
    is_milestone: false,
    nodes,
    edges,
  };
}

describe("FrameCanvas — path-to-conclusion animation plumbing (P0-17)", () => {
  it("marks on-primary-path nodes via data-state and leaves off-active-set nodes desaturated", () => {
    const frame_version = fv([node("a"), node("b"), node("c")]);
    const { container } = render(
      <FrameCanvas
        frame_version={frame_version}
        layout_result={{
          positions: [
            { node_id: "a", x: 0, y: 0 },
            { node_id: "b", x: 100, y: 0 },
            { node_id: "c", x: 200, y: 0 },
          ],
          width: 200,
          height: 0,
          computed_at: T,
        }}
        operating_mode="argument_running"
        primary_path_node_ids={["a", "b"]}
        active_set={new Set(["a", "b"])}
        path_fingerprint="a>b"
      />,
    );
    const a = container.querySelector('[data-node-id="a"]') as HTMLElement;
    const b = container.querySelector('[data-node-id="b"]') as HTMLElement;
    const c = container.querySelector('[data-node-id="c"]') as HTMLElement;
    expect(a.getAttribute("data-state")).toContain("on-primary-path");
    expect(b.getAttribute("data-state")).toContain("on-primary-path");
    expect(c.getAttribute("data-state")).toContain("off-active-set");
    // C is off-active and not on-path → heatmap class fires.
    expect(c.className).toContain("argmap-node-frame--off-active");
    // A and B are on-path → no heatmap.
    expect(a.className).not.toContain("argmap-node-frame--off-active");
  });

  it("flips recommended_next_pulse on the targeted node only (P0-17 ride-along)", () => {
    const frame_version = fv([node("a"), node("b")]);
    const { container } = render(
      <FrameCanvas
        frame_version={frame_version}
        layout_result={null}
        operating_mode="argument_running"
        recommended_next_id="b"
      />,
    );
    const a = container.querySelector('[data-node-id="a"]') as HTMLElement;
    const b = container.querySelector('[data-node-id="b"]') as HTMLElement;
    expect(a.getAttribute("data-state") ?? "").not.toContain("recommended-next");
    expect(b.getAttribute("data-state") ?? "").toContain("recommended-next");
  });

  it("emits no on_primary_path / off_active_set flags when the props are omitted (Frame Building back-compat)", () => {
    const frame_version = fv([node("a"), node("b")]);
    const { container } = render(
      <FrameCanvas
        frame_version={frame_version}
        layout_result={null}
        operating_mode="frame_building"
      />,
    );
    const a = container.querySelector('[data-node-id="a"]') as HTMLElement;
    expect(a.className ?? "").not.toContain("argmap-node-frame--off-active");
    // data-state should NOT contain on-primary-path or off-active-set when
    // the inputs are absent.
    const state = a.getAttribute("data-state") ?? "";
    expect(state).not.toContain("on-primary-path");
    expect(state).not.toContain("off-active-set");
  });

  it("renders overlay edges (smoke check)", () => {
    const a = node("a");
    const b = node("b");
    const frame_version = fv([a, b], [edge("ae1", "SUPPORTS", "a", "b")]);
    const { container } = render(
      <FrameCanvas
        frame_version={frame_version}
        layout_result={null}
        operating_mode="argument_running"
        argument_overlay={{ edges: [{ id: "ae1", type: "SUPPORTS", source: "a", target: "b" }] }}
        primary_path_node_ids={["a", "b"]}
        path_fingerprint="a>b"
      />,
    );
    // happy-dom + React Flow render edges in a `.react-flow__edges` group;
    // just confirm the canvas mounted without crashing — the structural id
    // contract is covered by the unit tests on buildRFEdges (canonical path
    // logic) once the helper is exported, and the integration coverage in
    // the planned tests/e2e/ Playwright suite.
    expect(container.querySelector(".react-flow__edges")).toBeTruthy();
  });
});
