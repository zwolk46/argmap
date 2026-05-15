/**
 * canvas-harness — standalone Vite entry mounting <FrameCanvas /> with two
 * pre-positioned nodes and no Supabase/auth dependency. Used by the
 * Playwright e2e test in tests/e2e/canvas-interaction.spec.ts to exercise
 * REAL pointer events against the canvas. The happy-dom unit tests can only
 * verify prop wiring; this file exists because that wasn't enough to catch
 * a regression where clicks fell through to background panning.
 *
 * The harness logs each callback (`on_node_moved`, `onSelectionChange`,
 * etc.) onto a `window.__canvasEvents` array. Tests poll that array to
 * assert behavior end-to-end.
 *
 * The harness mirrors the real app's wiring in two ways that turned out to
 * matter for catching a feedback-loop bug:
 *   1. The frame_version source-of-truth is a Zustand vanilla store wrapped
 *      with useSyncExternalStore, so renders look the same as the real app.
 *   2. The `selection` prop is rebuilt as a fresh array each render (the
 *      ternary in frame-building-page.tsx behaves the same way).
 *   3. A SiblingInspector subscribes to the selection state too, so any
 *      "Maximum update depth" loop has the same shape as the production
 *      tree (canvas + sibling both subscribing on each render).
 *
 * The window also installs an error trap (window.__renderErrors) so the
 * playwright spec can assert there were NO unhandled render errors during
 * the click — the original bug throws "Maximum update depth exceeded" from
 * react-dom and the unit tests never saw it.
 */
import * as React from "react";
import ReactDOM from "react-dom/client";
import { createStore } from "zustand/vanilla";
import { useSyncExternalStore } from "react";
import type { FrameVersion, NodeRef, Node, Edge } from "@/schema";
import { FrameCanvas } from "@/ui/canvas";
import "./ui/styles/tokens.css";
import "./ui/styles/global.css";
import "./ui/styles/react-flow.css";

type CanvasEvent =
  | { kind: "node_moved"; node_id: string; x: number; y: number }
  | { kind: "selection_change"; node_ids: ReadonlyArray<string> }
  | { kind: "edge_created"; source: string; target: string }
  | { kind: "node_delete_requested"; node_id: string };

declare global {
  interface Window {
    __canvasEvents: CanvasEvent[];
    __pushCanvasEvent: (e: CanvasEvent) => void;
    __renderErrors: string[];
  }
}

window.__canvasEvents = [];
window.__pushCanvasEvent = (e: CanvasEvent) => {
  window.__canvasEvents.push(e);
};
window.__renderErrors = [];

// Trap render errors so the playwright spec can assert the click did not
// blow up React. console.error is what react-dom uses for "Maximum update
// depth exceeded" and similar invariants in dev mode.
const original_console_error = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const first = args[0];
  const message = typeof first === "string" ? first : String(first);
  if (
    message.includes("Maximum update depth exceeded") ||
    message.includes("Too many re-renders") ||
    message.includes("infinite loop")
  ) {
    window.__renderErrors.push(message);
  }
  original_console_error(...args);
};

function makeNode(id: string, x: number, y: number): Node {
  return {
    id,
    type: "RootQuestion",
    layer: "frame",
    statement: id,
    question: id,
    created_at: "2026-05-13T00:00:00.000Z",
    updated_at: "2026-05-13T00:00:00.000Z",
    presentation: { x, y },
  } as unknown as Node;
}

const INITIAL_FRAME_VERSION: FrameVersion = {
  id: "fv-harness",
  frame_id: "fr-harness",
  version_number: 1,
  created_at: "2026-05-13T00:00:00.000Z",
  is_milestone: false,
  nodes: [makeNode("node-a", 100, 100), makeNode("node-b", 400, 100)],
  edges: [] as Edge[],
};

// Zustand vanilla store mirroring the real app's createFrameStore shape:
// the canvas's reactive flow is sensitive to whether `frame_version` comes
// from a useSyncExternalStore source vs. local React useState. A click in
// the real app triggers setSelection in the parent → parent re-renders →
// useFrameStore((s) => s) returns the SAME state object (Zustand didn't
// change) → frame_version prop is stable across renders. The harness needs
// to behave the same way to exercise the loop-vs-stable path.
type HarnessStoreState = {
  frame_version: FrameVersion;
  selection_state: { kind: "empty" } | { kind: "node"; node_id: NodeRef };
  setNodes(nodes: Node[]): void;
  setSelection(node_ids: ReadonlyArray<NodeRef>): void;
};

const harness_store = createStore<HarnessStoreState>((set) => ({
  frame_version: INITIAL_FRAME_VERSION,
  selection_state: { kind: "empty" },
  setNodes: (nodes) =>
    set((s) => ({
      frame_version: { ...s.frame_version, nodes },
    })),
  setSelection: (node_ids) =>
    set(() => ({
      selection_state:
        node_ids.length === 1 ? { kind: "node", node_id: node_ids[0]! } : { kind: "empty" },
    })),
}));

function useHarnessStore<T>(selector: (s: HarnessStoreState) => T): T {
  return useSyncExternalStore(
    harness_store.subscribe,
    () => selector(harness_store.getState()),
    () => selector(harness_store.getState()),
  );
}

// An outline-tree-style external selection button: clicking it sets selection
// via the harness store directly, bypassing the canvas. The canvas should
// visually reflect this selection (mirroring the real app's left-pane outline
// tree → canvas selection wiring).
function ExternalSelectionTrigger(): React.ReactElement {
  return (
    <button
      data-testid="external-select-node-b"
      style={{
        position: "absolute",
        top: 40,
        right: 8,
        padding: "4px 8px",
        background: "white",
        border: "1px solid #ccc",
        borderRadius: 6,
        fontSize: 11,
        zIndex: 20,
        cursor: "pointer",
      }}
      onClick={() => harness_store.getState().setSelection(["node-b" as NodeRef])}
    >
      Select node-b externally
    </button>
  );
}

// A sibling that also subscribes to selection — mirrors the Inspector in
// the real app. Its presence ensures re-render fan-out matches production.
function SiblingInspector(): React.ReactElement {
  const selection_state = useHarnessStore((s) => s.selection_state);
  const label =
    selection_state.kind === "node" ? `selected: ${selection_state.node_id}` : "no selection";
  return (
    <div
      data-testid="sibling-inspector"
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        padding: "6px 10px",
        background: "white",
        border: "1px solid #ccc",
        borderRadius: 6,
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
        zIndex: 20,
      }}
    >
      {label}
    </div>
  );
}

function Harness(): React.ReactElement {
  const frame_version = useHarnessStore((s) => s.frame_version);
  const selection_state = useHarnessStore((s) => s.selection_state);

  // Mirror the real app's selection-prop construction: a fresh array each
  // parent render via a ternary. Stable canvas implementations gate on the
  // CONTENT of this array, not identity.
  const selection: ReadonlyArray<NodeRef> =
    selection_state.kind === "node" ? [selection_state.node_id] : [];

  return (
    <>
      <FrameCanvas
        frame_version={frame_version}
        layout_result={null}
        operating_mode="frame_building"
        legal_mode={false}
        selection={selection}
        on_node_moved={(node_id, x, y) => {
          window.__pushCanvasEvent({ kind: "node_moved", node_id, x, y });
          const next_nodes = harness_store
            .getState()
            .frame_version.nodes.map((n) =>
              n.id === node_id ? ({ ...n, presentation: { x, y } } as unknown as Node) : n,
            );
          harness_store.getState().setNodes(next_nodes);
        }}
        on_edge_created={(source, target) => {
          window.__pushCanvasEvent({ kind: "edge_created", source, target });
        }}
        on_node_delete_requested={(node_id) => {
          window.__pushCanvasEvent({ kind: "node_delete_requested", node_id });
        }}
        onSelectionChange={(node_ids) => {
          window.__pushCanvasEvent({
            kind: "selection_change",
            node_ids: [...node_ids],
          });
          harness_store.getState().setSelection(node_ids);
        }}
      />
      <SiblingInspector />
      <ExternalSelectionTrigger />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <div data-testid="canvas-harness" style={{ width: "100vw", height: "100vh" }}>
      <Harness />
    </div>
  </React.StrictMode>,
);
