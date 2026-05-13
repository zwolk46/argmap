import * as React from "react";
import type { ReactElement } from "react";
import { ReactFlow, Background, useReactFlow, ReactFlowProvider } from "@xyflow/react";
import type { Node as RFNode, Edge as RFEdge, Connection } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { FrameVersion, NodeRef } from "@/schema";
import type { NodeStatus } from "@/schema";
import type { LayoutResult } from "@/layout";
import { nodeTypes } from "./nodes";
import type { FrameCanvasNodeData, NodeDisplayFlags } from "./nodes";
import { edgeTypes } from "./edges";
import type { FrameCanvasEdgeData, ForeclosureVisibility } from "./edges";
import { CanvasToolbar } from "./canvas-toolbar";
import { CanvasMinimap } from "./minimap";

export type { ForeclosureVisibility } from "./edges";

export interface FrameCanvasHandle {
  fitToScreen(): void;
  zoomToNode(node_id: NodeRef): void;
  zoom(direction: "in" | "out"): void;
}

export interface ArgumentOverlay {
  edges: ReadonlyArray<{
    id: string;
    type: "ANSWERS" | "SUPPORTS" | "CONTRADICTS";
    source: NodeRef;
    target: NodeRef;
    weight?: number;
  }>;
}

export interface FrameCanvasProps {
  frame_version: FrameVersion;
  layout_result: LayoutResult | null;
  operating_mode?: "frame_building" | "argument_running";
  status_map?: Readonly<Record<string, NodeStatus>>;
  argument_overlay?: ArgumentOverlay;
  foreclosure_visibility?: ForeclosureVisibility;
  selection?: ReadonlyArray<NodeRef>;
  legal_mode?: boolean;
  read_only?: boolean;
  on_node_moved?: (node_id: NodeRef, x: number, y: number) => void;
  on_edge_created?: (
    source: NodeRef,
    target: NodeRef,
    drop_position?: { x: number; y: number },
  ) => void;
  /** P1: keyboard Delete/Backspace on a selected node. Caller should run the
   *  cascade-delete confirmation flow. */
  on_node_delete_requested?: (node_id: NodeRef) => void;
  /** P1: keyboard Delete/Backspace on a selected edge. Caller should dispatch
   *  the matching edge_removed patch. */
  on_edge_delete_requested?: (edge_id: string) => void;
  onSelectionChange?: (node_ids: ReadonlyArray<NodeRef>) => void;
  onAutoArrange?: () => void;
  search?: string;
  handle?: React.Ref<FrameCanvasHandle>;
  /**
   * P0-17 — path-to-conclusion animation inputs. Ordered list of node ids
   * the runtime resolved as the primary path. When this changes between
   * renders, overlay edges replay their fade-in trace.
   */
  primary_path_node_ids?: ReadonlyArray<NodeRef>;
  /**
   * P0-17 — compute_result.active_set passed through. Nodes outside the
   * set render desaturated (heatmap steady state).
   */
  active_set?: ReadonlySet<NodeRef> | ReadonlyArray<NodeRef>;
  /**
   * P0-17 — fingerprint of the primary-path sequence. Used as a stable
   * react key on overlay edges so trace animation replays when path
   * changes. Computed by ArgumentRunningPage from primary_path_node_ids.
   */
  path_fingerprint?: string;
  /**
   * P0-17 ride-along — the interview's recommended-next node id. When
   * supplied, that node's display.recommended_next_pulse is true so the
   * existing pulse-recommended keyframe actually fires (the infra was
   * wired in node-frame.tsx but the flag was hardcoded false).
   */
  recommended_next_id?: NodeRef | null;
}

function defaultDisplayFlags(
  node_id: NodeRef,
  selection?: ReadonlyArray<NodeRef>,
  primary_path_set?: ReadonlySet<NodeRef>,
  active_set_set?: ReadonlySet<NodeRef>,
  recommended_next_id?: NodeRef | null,
): NodeDisplayFlags {
  // P0-17: on-primary-path / off-active-set determine the heatmap; when
  // either input is absent, both flags stay false and the canvas renders
  // exactly as before (back-compat for Frame Building, which doesn't
  // compute primary_path).
  const on_primary_path = primary_path_set !== undefined ? primary_path_set.has(node_id) : false;
  const has_active_signal = active_set_set !== undefined && active_set_set.size > 0;
  const off_active_set = has_active_signal ? !active_set_set!.has(node_id) : false;
  return {
    selected: selection?.includes(node_id) ?? false,
    hovered: false,
    not_applicable_dim: false,
    foreclosed_strikethrough: false,
    recommended_next_pulse: recommended_next_id === node_id,
    indeterminate_gate_dashed: false,
    on_primary_path,
    off_active_set,
  };
}

function buildRFNodes(
  frame_version: FrameVersion,
  layout_result: LayoutResult | null,
  status_map: Readonly<Record<string, NodeStatus>> | undefined,
  operating_mode: string,
  legal_mode: boolean,
  selection: ReadonlyArray<NodeRef> | undefined,
  read_only: boolean,
  primary_path_set: ReadonlySet<NodeRef> | undefined,
  active_set: ReadonlySet<NodeRef> | undefined,
  recommended_next_id: NodeRef | null | undefined,
): RFNode<FrameCanvasNodeData>[] {
  return frame_version.nodes.map((node) => {
    // P0-10: prefer the node's own anchored coordinates (set by a drag) over
    // the layout result. This pins user drags immediately even when the
    // layout consumer's structural hash hasn't caused ELK to re-run, AND
    // overrides the (0,0) fallback when layout_result is null.
    const anchor =
      node.presentation?.x !== undefined && node.presentation?.y !== undefined
        ? { x: node.presentation.x, y: node.presentation.y }
        : null;
    const pos = anchor ?? layout_result?.positions.find((p) => p.node_id === node.id);
    const status = status_map?.[node.id];
    const is_indeterminate = status?.failed_conditions?.includes("inputs_indeterminate") ?? false;

    const primary_text =
      "question" in node
        ? (node as { question: string }).question
        : "statement" in node
          ? (node as { statement: string }).statement
          : "name" in node
            ? (node as { name: string }).name
            : "citation" in node
              ? (node as { citation: string }).citation
              : node.id;

    const variant_map: Record<string, FrameCanvasNodeData["variant"]> = {
      RootQuestion: "root_question",
      SubQuestion: "sub_question",
      Term: "term",
      Interpretation: "interpretation",
      Checkpoint: "checkpoint",
      LogicalGate: "logical_gate",
      Conclusion: "conclusion",
      Authority: "authority",
      Premise: "premise_pill",
    };

    const display = defaultDisplayFlags(
      node.id as NodeRef,
      selection,
      primary_path_set,
      active_set,
      recommended_next_id,
    );
    display.indeterminate_gate_dashed = is_indeterminate && node.type === "LogicalGate";

    return {
      id: node.id,
      type: node.type,
      position: pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 },
      data: {
        node_id: node.id as NodeRef,
        primary_text,
        variant: variant_map[node.type] ?? "sub_question",
        status,
        display,
        enable_connector_handle: !read_only && operating_mode === "frame_building",
        legal_mode,
        gate_glyph:
          // P0-8: schema gate_type is "AND"|"OR"|"NOT"|"IF_THEN"|"UNLESS";
          // the old map used the never-matching "AndGate" forms so every
          // gate rendered as the fallback "⊕".
          node.type === "LogicalGate" && "gate_type" in node
            ? ((
                {
                  AND: "∧",
                  OR: "∨",
                  NOT: "¬",
                  IF_THEN: "→",
                  UNLESS: "⊘",
                } as Record<string, "∧" | "∨" | "¬" | "→" | "⊘">
              )[(node as { gate_type: string }).gate_type] ?? "⊕")
            : undefined,
      } satisfies FrameCanvasNodeData,
    };
  });
}

function buildRFEdges(
  frame_version: FrameVersion,
  operating_mode: string,
  foreclosure_visibility: ForeclosureVisibility,
  argument_overlay: ArgumentOverlay | undefined,
  primary_path: ReadonlyArray<NodeRef> | undefined,
  path_fingerprint: string | undefined,
): RFEdge<FrameCanvasEdgeData>[] {
  // Build a position map for primary-path nodes so we can stagger the
  // trace animation and detect on-path overlay edges. P0-17.
  const path_index_by_node = new Map<NodeRef, number>();
  if (primary_path) {
    for (let i = 0; i < primary_path.length; i++) {
      path_index_by_node.set(primary_path[i]!, i);
    }
  }
  const edges: RFEdge<FrameCanvasEdgeData>[] = [];

  for (const edge of frame_version.edges) {
    if (edge.type === "BINDING_IN") continue;
    if (
      (edge.type === "ANSWERS" || edge.type === "SUPPORTS" || edge.type === "CONTRADICTS") &&
      operating_mode !== "argument_running"
    ) {
      continue;
    }

    edges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      data: {
        edge_type: edge.type,
        foreclosure_visibility: edge.type === "FORECLOSES" ? foreclosure_visibility : undefined,
      },
    });
  }

  for (const node of frame_version.nodes) {
    if (node.type === "Checkpoint" && "options" in node) {
      const checkpoint = node as {
        id: string;
        options: Array<{ id: string; target_node_id?: string; label: string }>;
      };
      for (const opt of checkpoint.options) {
        if (opt.target_node_id) {
          edges.push({
            id: `checkpoint_option_${checkpoint.id}_${opt.id}`,
            source: checkpoint.id,
            target: opt.target_node_id,
            type: "checkpoint_option",
            data: {
              edge_type: "checkpoint_option",
              option_label: opt.label,
            },
          });
        }
      }
    }
  }

  if (operating_mode === "argument_running" && argument_overlay) {
    for (const ae of argument_overlay.edges) {
      // P0-17: an overlay edge is "on the primary path" when both endpoints
      // appear in compute_result.output.primary_path. The trace animation's
      // stagger uses target's index in the path so each edge fades in in
      // the same order the resolution actually flows. When the fingerprint
      // changes, we incorporate it into the edge id so React Flow remounts
      // the edge and the keyframe replays from the start.
      const source_in_path = path_index_by_node.has(ae.source as NodeRef);
      const target_in_path = path_index_by_node.has(ae.target as NodeRef);
      const on_primary_path = source_in_path && target_in_path;
      const path_index = on_primary_path ? path_index_by_node.get(ae.target as NodeRef) : undefined;
      const edge_id = on_primary_path
        ? `overlay_${ae.id}__${path_fingerprint ?? "init"}`
        : `overlay_${ae.id}`;
      edges.push({
        id: edge_id,
        source: ae.source,
        target: ae.target,
        type: ae.type,
        data: {
          edge_type: ae.type,
          weight_tier: (ae.weight ?? 1) as 0 | 1 | 2 | 3 | 4 | 5,
          on_primary_path,
          path_index,
          path_fingerprint,
        },
      });
    }
  }

  return edges;
}

function FrameCanvasInner(props: FrameCanvasProps): ReactElement {
  const {
    frame_version,
    layout_result,
    operating_mode = "frame_building",
    status_map,
    argument_overlay,
    foreclosure_visibility = "visible",
    selection,
    legal_mode = false,
    read_only = false,
    on_node_moved,
    on_edge_created,
    onSelectionChange,
    onAutoArrange,
    handle,
    primary_path_node_ids,
    active_set,
    path_fingerprint,
    recommended_next_id = null,
  } = props;

  // Normalize to sets for O(1) membership lookup during render. The hook
  // re-runs when the referenced array changes — fine because the page
  // passes referentially-stable snapshots from useSessionStore.
  const primary_path_set = React.useMemo(
    () => (primary_path_node_ids ? new Set<NodeRef>(primary_path_node_ids) : undefined),
    [primary_path_node_ids],
  );
  const active_set_set = React.useMemo(() => {
    if (!active_set) return undefined;
    if (active_set instanceof Set) return active_set;
    return new Set<NodeRef>(active_set);
  }, [active_set]);

  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();
  const last_connect_position = React.useRef<{ x: number; y: number } | null>(null);
  const [fc_visibility, setFcVisibility] =
    React.useState<ForeclosureVisibility>(foreclosure_visibility);

  React.useImperativeHandle(handle, () => ({
    fitToScreen: () => fitView(),
    zoomToNode: (node_id: NodeRef) => {
      const pos = layout_result?.positions.find((p) => p.node_id === node_id);
      if (pos) setCenter(pos.x, pos.y, { zoom: 1.2, duration: 300 });
    },
    zoom: (direction: "in" | "out") => {
      if (direction === "in") zoomIn();
      else zoomOut();
    },
  }));

  const rf_nodes = buildRFNodes(
    frame_version,
    layout_result,
    status_map,
    operating_mode,
    legal_mode,
    selection,
    read_only,
    primary_path_set,
    active_set_set,
    recommended_next_id,
  );
  const rf_edges = buildRFEdges(
    frame_version,
    operating_mode,
    fc_visibility,
    argument_overlay,
    primary_path_node_ids,
    path_fingerprint,
  );

  function handleNodeDragStop(_: React.MouseEvent, node: RFNode<FrameCanvasNodeData>) {
    if (read_only) return;
    on_node_moved?.(node.data.node_id, node.position.x, node.position.y);
  }

  function handleSelectionChange({ nodes }: { nodes: RFNode<FrameCanvasNodeData>[] }) {
    onSelectionChange?.(nodes.map((n) => n.data.node_id));
  }

  // P1: handleConnect fires BEFORE handleConnectEnd, so last_connect_position
  // was null when on_edge_created tried to use it — the popup opened at
  // window center instead of near the drop. We now stash the validated
  // connection here and fire on_edge_created from handleConnectEnd, by
  // which point we have a drop position.
  const pending_connection = React.useRef<{ source: NodeRef; target: NodeRef } | null>(null);

  function handleConnect(connection: Connection) {
    if (read_only) return;
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) return;
    pending_connection.current = {
      source: connection.source as NodeRef,
      target: connection.target as NodeRef,
    };
  }

  function handleConnectEnd(event: MouseEvent | TouchEvent) {
    const point =
      "clientX" in event
        ? { x: event.clientX, y: event.clientY }
        : event.changedTouches && event.changedTouches[0]
          ? { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }
          : null;
    last_connect_position.current = point;
    // Fire on_edge_created here so the drop position is available.
    if (pending_connection.current) {
      on_edge_created?.(
        pending_connection.current.source,
        pending_connection.current.target,
        point ?? undefined,
      );
      pending_connection.current = null;
    }
  }

  // P1: keyboard delete. React Flow's deleteKeyCode (default Backspace +
  // Delete) emits onNodesDelete / onEdgesDelete when the user presses one
  // with a selection. We forward both as cascade-delete requests for nodes
  // and direct edge removals for edges.
  function handleNodesDelete(deleted_nodes: RFNode<FrameCanvasNodeData>[]) {
    if (read_only) return;
    for (const n of deleted_nodes) {
      props.on_node_delete_requested?.(n.data.node_id);
    }
  }
  function handleEdgesDelete(deleted_edges: RFEdge<FrameCanvasEdgeData>[]) {
    if (read_only) return;
    for (const e of deleted_edges) {
      // Skip overlay / option synthetic ids.
      if (e.id.startsWith("overlay_") || e.id.startsWith("checkpoint_option_")) continue;
      props.on_edge_delete_requested?.(e.id);
    }
  }

  return (
    <div
      data-testid="frame-canvas"
      data-read-only={read_only}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <ReactFlow
        nodes={rf_nodes}
        edges={rf_edges}
        nodeTypes={nodeTypes as never}
        edgeTypes={edgeTypes as never}
        onNodeDragStop={handleNodeDragStop}
        onSelectionChange={handleSelectionChange as never}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        deleteKeyCode={read_only ? null : ["Delete", "Backspace"]}
        nodesDraggable={!read_only}
        edgesReconnectable={!read_only}
        nodesConnectable={!read_only}
        fitView
        proOptions={{ hideAttribution: true }}
        style={{ background: "var(--color-surface-canvas)" }}
      >
        <Background gap={22} size={1} color="var(--color-border-subtle)" />
        <CanvasMinimap />
        <CanvasToolbar
          foreclosure_visibility={fc_visibility}
          onForeclosureVisibilityChange={setFcVisibility}
          onAutoArrange={onAutoArrange}
        />
      </ReactFlow>
    </div>
  );
}

export function FrameCanvas(props: FrameCanvasProps): ReactElement {
  return (
    <ReactFlowProvider>
      <FrameCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
