// @vitest-environment happy-dom
/**
 * Guards for frame-canvas interaction correctness.
 *
 * Root cause that prompted this file: @xyflow/react v12 controlled mode
 * REQUIRES onNodesChange + onEdgesChange on <ReactFlow>. Without them, the
 * library cannot update its own internal state, so every user interaction
 * (node drag, node click to select, handle-to-handle connect) silently falls
 * through to background panning. The bug is invisible to TypeScript because
 * the props are optional — only a runtime test catches it.
 *
 * Test strategy: we vi.mock @xyflow/react so that our spy captures the exact
 * props passed to <ReactFlow>, letting us assert the callbacks are wired
 * without having to simulate real pointer events (which happy-dom can't
 * reliably deliver for React Flow's internals).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import type { FrameVersion, Node } from "@/schema";

// ---------- helpers -------------------------------------------------------

function makeNode(id: string, x?: number, y?: number): Node {
  return {
    id,
    type: "RootQuestion",
    layer: "frame",
    statement: id,
    created_at: "2026-05-13T00:00:00.000Z",
    updated_at: "2026-05-13T00:00:00.000Z",
    ...(x !== undefined || y !== undefined ? { presentation: { x, y } } : {}),
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

// ---------- spy on ReactFlow props ----------------------------------------

// Capture the most recent set of props that <ReactFlow> was rendered with.
// We do this at module scope so the mock can be set up via vi.mock (which
// is hoisted by Vite/vitest to the top of the module).
let lastReactFlowProps: Record<string, unknown> | null = null;

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return {
    ...actual,
    // Replace only ReactFlow so the real implementation of hooks (useReactFlow
    // etc.) continues to work. Our wrapper captures props then delegates to null
    // — we don't need real rendering for this test suite.
    ReactFlow: (props: Record<string, unknown>) => {
      lastReactFlowProps = props;
      return null;
    },
  };
});

// Import AFTER the mock so the component under test picks up the spy.
// Dynamic import via lazy would also work; the top-level import works here
// because vi.mock hoisting runs first.
import { FrameCanvas } from "@/ui/canvas";

// ---------- tests ----------------------------------------------------------

describe("FrameCanvas — onNodesChange / onEdgesChange wiring", () => {
  beforeEach(() => {
    lastReactFlowProps = null;
  });

  it("passes onNodesChange to ReactFlow", () => {
    const fv = makeFv([makeNode("n1", 100, 200)]);
    render(
      <FrameCanvas
        frame_version={fv}
        layout_result={null}
        operating_mode="frame_building"
        legal_mode={false}
      />,
    );
    expect(typeof lastReactFlowProps?.onNodesChange).toBe("function");
  });

  it("passes onEdgesChange to ReactFlow", () => {
    const fv = makeFv([makeNode("n1", 100, 200)]);
    render(
      <FrameCanvas
        frame_version={fv}
        layout_result={null}
        operating_mode="frame_building"
        legal_mode={false}
      />,
    );
    expect(typeof lastReactFlowProps?.onEdgesChange).toBe("function");
  });

  it("passes nodesDraggable=true when read_only is false (default)", () => {
    const fv = makeFv([makeNode("n1", 0, 0)]);
    render(
      <FrameCanvas
        frame_version={fv}
        layout_result={null}
        operating_mode="frame_building"
        legal_mode={false}
      />,
    );
    expect(lastReactFlowProps?.nodesDraggable).toBe(true);
  });

  it("passes nodesDraggable=false when read_only=true", () => {
    const fv = makeFv([makeNode("n1", 0, 0)]);
    render(
      <FrameCanvas
        frame_version={fv}
        layout_result={null}
        operating_mode="frame_building"
        legal_mode={false}
        read_only={true}
      />,
    );
    expect(lastReactFlowProps?.nodesDraggable).toBe(false);
  });

  it("passes nodesConnectable=true in frame_building mode when not read_only", () => {
    const fv = makeFv([makeNode("n1", 0, 0)]);
    render(
      <FrameCanvas
        frame_version={fv}
        layout_result={null}
        operating_mode="frame_building"
        legal_mode={false}
      />,
    );
    expect(lastReactFlowProps?.nodesConnectable).toBe(true);
  });
});

describe("FrameCanvas — onNodeDragStop → on_node_moved", () => {
  beforeEach(() => {
    lastReactFlowProps = null;
  });

  it("fires on_node_moved with the node's final position when drag stops", () => {
    const on_node_moved = vi.fn();
    const fv = makeFv([makeNode("n1", 50, 50)]);

    render(
      <FrameCanvas
        frame_version={fv}
        layout_result={null}
        operating_mode="frame_building"
        legal_mode={false}
        on_node_moved={on_node_moved}
      />,
    );

    // Simulate React Flow calling onNodeDragStop with the node at a new position.
    const handler = lastReactFlowProps?.onNodeDragStop as (
      e: React.MouseEvent,
      node: { data: { node_id: string }; position: { x: number; y: number } },
    ) => void;
    expect(typeof handler).toBe("function");

    handler({} as React.MouseEvent, { data: { node_id: "n1" }, position: { x: 300, y: 400 } });

    expect(on_node_moved).toHaveBeenCalledOnce();
    expect(on_node_moved).toHaveBeenCalledWith("n1", 300, 400);
  });

  it("does NOT fire on_node_moved when read_only=true", () => {
    const on_node_moved = vi.fn();
    const fv = makeFv([makeNode("n1", 50, 50)]);

    render(
      <FrameCanvas
        frame_version={fv}
        layout_result={null}
        operating_mode="frame_building"
        legal_mode={false}
        read_only={true}
        on_node_moved={on_node_moved}
      />,
    );

    const handler = lastReactFlowProps?.onNodeDragStop as (
      e: React.MouseEvent,
      node: { data: { node_id: string }; position: { x: number; y: number } },
    ) => void;
    handler({} as React.MouseEvent, { data: { node_id: "n1" }, position: { x: 999, y: 999 } });
    expect(on_node_moved).not.toHaveBeenCalled();
  });
});

describe("FrameCanvas — onConnect + onConnectEnd → on_edge_created", () => {
  beforeEach(() => {
    lastReactFlowProps = null;
  });

  it("fires on_edge_created with source and target when a connection is made", () => {
    const on_edge_created = vi.fn();
    const fv = makeFv([makeNode("n1", 0, 0), makeNode("n2", 200, 0)]);

    render(
      <FrameCanvas
        frame_version={fv}
        layout_result={null}
        operating_mode="frame_building"
        legal_mode={false}
        on_edge_created={on_edge_created}
      />,
    );

    const onConnect = lastReactFlowProps?.onConnect as (conn: {
      source: string;
      target: string;
    }) => void;
    const onConnectEnd = lastReactFlowProps?.onConnectEnd as (event: MouseEvent) => void;

    expect(typeof onConnect).toBe("function");
    expect(typeof onConnectEnd).toBe("function");

    // Simulate a drag-from-handle-to-handle sequence.
    onConnect({ source: "n1", target: "n2" });
    onConnectEnd(new MouseEvent("mouseup", { clientX: 220, clientY: 20 }));

    expect(on_edge_created).toHaveBeenCalledOnce();
    expect(on_edge_created).toHaveBeenCalledWith("n1", "n2", { x: 220, y: 20 });
  });

  it("does NOT fire on_edge_created when source equals target (self-loop)", () => {
    const on_edge_created = vi.fn();
    const fv = makeFv([makeNode("n1", 0, 0)]);

    render(
      <FrameCanvas
        frame_version={fv}
        layout_result={null}
        operating_mode="frame_building"
        legal_mode={false}
        on_edge_created={on_edge_created}
      />,
    );

    const onConnect = lastReactFlowProps?.onConnect as (conn: {
      source: string;
      target: string;
    }) => void;
    const onConnectEnd = lastReactFlowProps?.onConnectEnd as (event: MouseEvent) => void;

    onConnect({ source: "n1", target: "n1" });
    onConnectEnd(new MouseEvent("mouseup", { clientX: 0, clientY: 0 }));

    expect(on_edge_created).not.toHaveBeenCalled();
  });

  it("does NOT fire on_edge_created when read_only=true", () => {
    const on_edge_created = vi.fn();
    const fv = makeFv([makeNode("n1", 0, 0), makeNode("n2", 200, 0)]);

    render(
      <FrameCanvas
        frame_version={fv}
        layout_result={null}
        operating_mode="frame_building"
        legal_mode={false}
        read_only={true}
        on_edge_created={on_edge_created}
      />,
    );

    const onConnect = lastReactFlowProps?.onConnect as (conn: {
      source: string;
      target: string;
    }) => void;
    const onConnectEnd = lastReactFlowProps?.onConnectEnd as (event: MouseEvent) => void;

    onConnect({ source: "n1", target: "n2" });
    onConnectEnd(new MouseEvent("mouseup", { clientX: 100, clientY: 100 }));

    expect(on_edge_created).not.toHaveBeenCalled();
  });
});

describe("FrameCanvas — onSelectionChange → onSelectionChange prop", () => {
  beforeEach(() => {
    lastReactFlowProps = null;
  });

  it("fires onSelectionChange with selected node IDs", () => {
    const onSelectionChange = vi.fn();
    const fv = makeFv([makeNode("n1", 0, 0), makeNode("n2", 200, 0)]);

    render(
      <FrameCanvas
        frame_version={fv}
        layout_result={null}
        operating_mode="frame_building"
        legal_mode={false}
        onSelectionChange={onSelectionChange}
      />,
    );

    const handler = lastReactFlowProps?.onSelectionChange as (params: {
      nodes: Array<{ data: { node_id: string } }>;
      edges: unknown[];
    }) => void;
    expect(typeof handler).toBe("function");

    handler({
      nodes: [{ data: { node_id: "n1" } }],
      edges: [],
    });

    expect(onSelectionChange).toHaveBeenCalledWith(["n1"], []);
  });

  it("fires onSelectionChange with empty array when deselecting all", () => {
    const onSelectionChange = vi.fn();
    const fv = makeFv([makeNode("n1", 0, 0)]);

    render(
      <FrameCanvas
        frame_version={fv}
        layout_result={null}
        operating_mode="frame_building"
        legal_mode={false}
        onSelectionChange={onSelectionChange}
      />,
    );

    const handler = lastReactFlowProps?.onSelectionChange as (params: {
      nodes: unknown[];
      edges: unknown[];
    }) => void;
    handler({ nodes: [], edges: [] });

    expect(onSelectionChange).toHaveBeenCalledWith([], []);
  });
});
