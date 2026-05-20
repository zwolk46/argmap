import * as React from "react";
import type { ReactElement } from "react";
import {
  ReactFlow,
  Background,
  useReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import type {
  Node as RFNode,
  Edge as RFEdge,
  Connection,
  NodeChange,
  EdgeChange,
} from "@xyflow/react";
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
import { EdgeMarkerDefs, markerEndFor } from "./edge-markers";
import { humanizeNodeType } from "../primitives";

// Background dot pitch. Mirrors --canvas-grid-gap in tokens.css. React
// Flow's <Background gap> prop takes a number, so we hold the value in
// TS rather than reading from CSS at runtime.
const CANVAS_GRID_GAP = 22;

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
  /** Palette drag-drop. Fired when the user drops a palette item onto the
   *  canvas with the application/argmap-palette-node MIME. The caller
   *  should create a node of `node_type` at the supplied canvas-space
   *  position. Without this prop the drop is ignored and the user-visible
   *  feedback is "drag silently snaps back". */
  on_palette_drop?: (node_type: string, position: { x: number; y: number }) => void;
  /** P1: keyboard Delete/Backspace on a selected node. Caller should run the
   *  cascade-delete confirmation flow. */
  on_node_delete_requested?: (node_id: NodeRef) => void;
  /** P1: keyboard Delete/Backspace on a selected edge. Caller should dispatch
   *  the matching edge_removed patch. */
  on_edge_delete_requested?: (edge_id: string) => void;
  onSelectionChange?: (node_ids: ReadonlyArray<NodeRef>, edge_ids?: ReadonlyArray<string>) => void;
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
  selection: ReadonlyArray<NodeRef> | undefined,
  primary_path_set: ReadonlySet<NodeRef> | undefined,
  active_set_set: ReadonlySet<NodeRef> | undefined,
  recommended_next_id: NodeRef | null | undefined,
  search_dimmed: boolean,
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
    search_dimmed,
  };
}

function buildRFNodes(
  frame_version: FrameVersion,
  layout_result: LayoutResult | null,
  status_map: Readonly<Record<string, NodeStatus>> | undefined,
  operating_mode: string,
  legal_mode: boolean,
  read_only: boolean,
  primary_path_set: ReadonlySet<NodeRef> | undefined,
  active_set: ReadonlySet<NodeRef> | undefined,
  recommended_next_id: NodeRef | null | undefined,
  search_query: string,
): RFNode<FrameCanvasNodeData>[] {
  const search_q = search_query.trim().toLowerCase();
  const search_active = search_q.length > 0;
  const out: RFNode<FrameCanvasNodeData>[] = [];
  for (const node of frame_version.nodes) {
    // P0-10: prefer the node's own anchored coordinates (set by a drag) over
    // the layout result. This pins user drags immediately even when the
    // layout consumer's structural hash hasn't caused ELK to re-run, AND
    // overrides the (0,0) fallback when layout_result is null.
    const anchor =
      node.presentation?.x !== undefined && node.presentation?.y !== undefined
        ? { x: node.presentation.x, y: node.presentation.y }
        : null;
    const layoutPos = layout_result?.positions.find((p) => p.node_id === node.id);
    const pos = anchor ?? layoutPos;
    // P0-9: once ELK has produced a layout, nodes excluded by
    // computeVisibleNodes (collapsed SubQuestion children, etc.) will have
    // no entry in layout_result.positions. Don't render them at (0,0); they
    // were intentionally hidden.
    if (!pos && layout_result) continue;
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

    const search_dimmed = search_active && !primary_text.toLowerCase().includes(search_q);

    // Selection is owned by the local rf_nodes state (RF mutates it via
    // applyNodeChanges; external selection changes are merged in by a
    // dedicated effect). buildRFNodes itself never sets the `selected`
    // flag — that would clobber RF's mid-interaction state on every
    // structural re-derivation.
    const display = defaultDisplayFlags(
      node.id as NodeRef,
      undefined,
      primary_path_set,
      active_set,
      recommended_next_id,
      search_dimmed,
    );
    display.indeterminate_gate_dashed = is_indeterminate && node.type === "LogicalGate";

    const authority_binding_kind: "binding" | "persuasive" | undefined =
      node.type === "Authority" && "is_binding" in node
        ? (node as { is_binding?: boolean }).is_binding === true
          ? "binding"
          : "persuasive"
        : undefined;

    // §13 #4: per-node aria-label so screen readers announce node identity
    // (kind + primary text) on Tab focus, instead of the generic "node"
    // aria-roledescription react-flow sets by default. Truncated to 120
    // chars so a long statement doesn't dominate the announcement.
    const aria_label_text =
      primary_text.length > 120 ? `${primary_text.slice(0, 117)}…` : primary_text;
    const aria_label = `${humanizeNodeType(node.type)}: ${aria_label_text || "(empty)"}`;

    out.push({
      id: node.id,
      type: node.type,
      position: pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 },
      ariaLabel: aria_label,
      data: {
        node_id: node.id as NodeRef,
        primary_text,
        variant: variant_map[node.type] ?? "sub_question",
        status,
        display,
        authority_binding_kind,
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
    });
  }
  return out;
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

    // An edge is on the primary path when BOTH endpoints are in the path
    // sequence AND their indices are adjacent. Source's index must be
    // one less than target's, so we trace the path in order rather than
    // highlighting every edge that touches a path node. The structural
    // edges aren't separately listed in `output.primary_path`, so we
    // derive on-path status here.
    const src_idx = path_index_by_node.get(edge.source as NodeRef);
    const tgt_idx = path_index_by_node.get(edge.target as NodeRef);
    const on_primary_path =
      src_idx !== undefined && tgt_idx !== undefined && tgt_idx === src_idx + 1;

    edges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      markerEnd: markerEndFor(edge.type, on_primary_path),
      data: {
        edge_type: edge.type,
        foreclosure_visibility: edge.type === "FORECLOSES" ? foreclosure_visibility : undefined,
        on_primary_path,
        path_index: on_primary_path ? tgt_idx : undefined,
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
          // Checkpoint-option synthetic edges: highlight when both ends are
          // adjacent on the primary path. Carries through the path-index
          // for animation staggering.
          const cp_src_idx = path_index_by_node.get(checkpoint.id as NodeRef);
          const cp_tgt_idx = path_index_by_node.get(opt.target_node_id as NodeRef);
          const cp_on_path =
            cp_src_idx !== undefined && cp_tgt_idx !== undefined && cp_tgt_idx === cp_src_idx + 1;
          edges.push({
            id: `checkpoint_option_${checkpoint.id}_${opt.id}`,
            source: checkpoint.id,
            target: opt.target_node_id,
            type: "checkpoint_option",
            markerEnd: markerEndFor("checkpoint_option", cp_on_path),
            data: {
              edge_type: "checkpoint_option",
              option_label: opt.label,
              on_primary_path: cp_on_path,
              path_index: cp_on_path ? cp_tgt_idx : undefined,
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
        markerEnd: markerEndFor(ae.type, on_primary_path),
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

// Reconcile structural updates from external sources (frame_version, layout,
// status_map, …) into RF's live state, preserving RF-owned transient
// interaction state (per-node selected flag, drag-in-progress position).
function reconcileNodes(
  current: ReadonlyArray<RFNode<FrameCanvasNodeData>>,
  desired: ReadonlyArray<RFNode<FrameCanvasNodeData>>,
): RFNode<FrameCanvasNodeData>[] {
  const current_by_id = new Map(current.map((n) => [n.id, n]));
  return desired.map((d) => {
    const c = current_by_id.get(d.id);
    if (!c) return d;
    return {
      ...d,
      selected: c.selected ?? d.selected,
      // Preserve RF's live position while the node is being dragged so the
      // sync doesn't snap it back to the store's pre-drag position.
      position: c.dragging ? c.position : d.position,
      dragging: c.dragging,
    };
  });
}

function reconcileEdges(
  current: ReadonlyArray<RFEdge<FrameCanvasEdgeData>>,
  desired: ReadonlyArray<RFEdge<FrameCanvasEdgeData>>,
): RFEdge<FrameCanvasEdgeData>[] {
  const current_by_id = new Map(current.map((e) => [e.id, e]));
  return desired.map((d) => {
    const c = current_by_id.get(d.id);
    if (!c) return d;
    return {
      ...d,
      selected: c.selected ?? d.selected,
    };
  });
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
    on_palette_drop,
    onSelectionChange,
    onAutoArrange,
    handle,
    primary_path_node_ids,
    active_set,
    path_fingerprint,
    recommended_next_id = null,
    search: search_prop,
  } = props;

  // Local search query. Stays a controlled state inside the canvas so the
  // input lives next to the canvas chrome; the parent can also seed it via
  // the `search` prop for deep-linking or external "find" affordances.
  const [search_query, setSearchQuery] = React.useState(search_prop ?? "");
  React.useEffect(() => {
    if (search_prop !== undefined) setSearchQuery(search_prop);
  }, [search_prop]);

  // P0-7: <Background color="var(...)"> doesn't resolve CSS vars to a usable
  // fill — xyflow paints the dots into a Canvas2D context, where var(...)
  // is meaningless. Resolve once at mount via getComputedStyle.
  const [bg_dot_color, setBgDotColor] = React.useState("#e0dcd8");
  React.useEffect(() => {
    const c = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-border-subtle")
      .trim();
    if (c) setBgDotColor(c);
  }, []);

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

  const { fitView, zoomIn, zoomOut, setCenter, screenToFlowPosition } = useReactFlow();
  const [fc_visibility, setFcVisibility] =
    React.useState<ForeclosureVisibility>(foreclosure_visibility);
  // Sync local state when the parent updates the prop. Without this the
  // initial value seeded once and later parent updates were ignored.
  React.useEffect(() => {
    setFcVisibility(foreclosure_visibility);
  }, [foreclosure_visibility]);

  React.useImperativeHandle(handle, () => ({
    fitToScreen: () => fitView(),
    zoomToNode: (node_id: NodeRef) => {
      // Prefer the user-dragged anchor (presentation.x/y) over the ELK
      // layout result. Without this, clicking "highlight on canvas" for
      // a node the user has moved sends the viewport to where ELK put
      // it originally, not where it actually is on screen.
      const node = frame_version.nodes.find((n) => n.id === node_id);
      const anchor =
        node?.presentation?.x !== undefined && node?.presentation?.y !== undefined
          ? { x: node.presentation.x, y: node.presentation.y }
          : null;
      const pos = anchor ?? layout_result?.positions.find((p) => p.node_id === node_id);
      if (pos) setCenter(pos.x, pos.y, { zoom: 1.2, duration: 300 });
    },
    zoom: (direction: "in" | "out") => {
      if (direction === "in") zoomIn();
      else zoomOut();
    },
  }));

  // React Flow v12 controlled mode requires the `nodes`/`edges` props to be
  // state we mutate via the `applyNodeChanges` / `applyEdgeChanges` reducers
  // RF tells us about. Without that wiring every interaction silently falls
  // through to background panning.
  //
  // Architecture (see React Flow docs — state-management guide):
  // - rf_nodes / rf_edges is the SINGLE source of truth React Flow renders
  //   against. We own it via plain useState.
  // - We derive `desired_rf_nodes` / `desired_rf_edges` from external sources
  //   (frame_version, layout, etc.) — STRUCTURAL deps only. `selection` is
  //   excluded; that's owned by the user's click state and synced separately
  //   via the selection effect below.
  // - When `desired_*` changes (frame_version mutated, a node added from the
  //   palette, layout recomputed, etc.) we reconcile: keep RF's transient
  //   state (selection, drag-in-progress position) and pull new structural /
  //   content data in.
  // - When the external `selection` prop changes (outline-tree click, etc.)
  //   we apply ONLY the selected flag, leaving everything else alone.
  //
  // Why this matters: the prior approach derived `desired_rf_nodes` from the
  // unstable `selection` prop and resynced every render, which fought
  // RF's onNodesChange selection update and meant click-to-select never
  // visibly stuck.
  const desired_rf_nodes = React.useMemo(
    () =>
      buildRFNodes(
        frame_version,
        layout_result,
        status_map,
        operating_mode,
        legal_mode,
        read_only,
        primary_path_set,
        active_set_set,
        recommended_next_id,
        search_query,
      ),
    [
      frame_version,
      layout_result,
      status_map,
      operating_mode,
      legal_mode,
      read_only,
      primary_path_set,
      active_set_set,
      recommended_next_id,
      search_query,
    ],
  );

  const desired_rf_edges = React.useMemo(
    () =>
      buildRFEdges(
        frame_version,
        operating_mode,
        fc_visibility,
        argument_overlay,
        primary_path_node_ids,
        path_fingerprint,
      ),
    [
      frame_version,
      operating_mode,
      fc_visibility,
      argument_overlay,
      primary_path_node_ids,
      path_fingerprint,
    ],
  );

  const [rf_nodes, setRfNodes] = React.useState<RFNode<FrameCanvasNodeData>[]>(
    () => desired_rf_nodes,
  );
  const [rf_edges, setRfEdges] = React.useState<RFEdge<FrameCanvasEdgeData>[]>(
    () => desired_rf_edges,
  );

  // Reconcile structural changes from external sources into rf_nodes,
  // preserving RF-owned transient state (selected, dragging, drag position).
  // Fires only when the deps that drive `buildRFNodes` change (frame_version
  // mutation, layout completes, etc.) — not on every parent re-render.
  React.useEffect(() => {
    setRfNodes((current) => reconcileNodes(current, desired_rf_nodes));
  }, [desired_rf_nodes]);

  React.useEffect(() => {
    setRfEdges((current) => reconcileEdges(current, desired_rf_edges));
  }, [desired_rf_edges]);

  // Mirror the external `selection` prop into RF's `selected` flags so the
  // outline-tree (or any other parent-driven selection source) updates the
  // canvas visually. Gated on a content-stable string key so a parent that
  // rebuilds the selection array each render (e.g., via inline ternary)
  // doesn't re-fire the effect every render. Idempotent updater: if RF's
  // current state already matches the wanted set, returns the same ref
  // (no re-render).
  const selection_key = React.useMemo(
    () => (selection ? [...selection].sort().join("|") : ""),
    [selection],
  );

  React.useEffect(() => {
    const wanted = new Set<string>(selection ?? []);
    setRfNodes((current) => {
      let changed = false;
      const next = current.map((n) => {
        const want = wanted.has(n.id);
        if ((n.selected ?? false) === want) return n;
        changed = true;
        return { ...n, selected: want };
      });
      return changed ? next : current;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection_key]);

  const onNodesChange = React.useCallback((changes: NodeChange[]) => {
    setRfNodes((nds) => applyNodeChanges(changes, nds) as RFNode<FrameCanvasNodeData>[]);
  }, []);
  const onEdgesChange = React.useCallback((changes: EdgeChange[]) => {
    setRfEdges((eds) => applyEdgeChanges(changes, eds) as RFEdge<FrameCanvasEdgeData>[]);
  }, []);

  // Stable refs for all RF event handlers. React Flow's SelectionListener
  // wires its useEffect with `onSelectionChange` in the dep list:
  //
  //   useEffect(() => { onSelectionChange?.(params); }, [..., onSelectionChange]);
  //
  // If our handler ref changes on every parent render (which happens when
  // callers pass arrow functions / inline function defs as props), that
  // effect fires every render, calls our handler, which calls setState in
  // the parent, which re-renders, which gives RF yet another fresh handler
  // ref — infinite loop, "Maximum update depth exceeded". The fix is to
  // make the function we pass to <ReactFlow onSelectionChange> stable for
  // the lifetime of the component, and read the latest caller callbacks
  // through a ref. We do the same for the other handlers we forward —
  // SelectionListener is the documented loop today, but stable refs are
  // the right default for any callback passed into a library that
  // memoizes against ref identity.
  const callbacks_ref = React.useRef({
    onSelectionChange,
    on_node_moved,
    on_edge_created,
    on_palette_drop,
    on_node_delete_requested: props.on_node_delete_requested,
    on_edge_delete_requested: props.on_edge_delete_requested,
    read_only,
  });
  callbacks_ref.current = {
    onSelectionChange,
    on_node_moved,
    on_edge_created,
    on_palette_drop,
    on_node_delete_requested: props.on_node_delete_requested,
    on_edge_delete_requested: props.on_edge_delete_requested,
    read_only,
  };

  const handleNodeClick = React.useCallback(
    (_: React.MouseEvent, node: RFNode<FrameCanvasNodeData>) => {
      const cb = callbacks_ref.current;
      if (!cb.read_only) cb.onSelectionChange?.([node.data.node_id]);
    },
    [],
  );

  const handleNodeDragStop = React.useCallback(
    (_: React.MouseEvent, node: RFNode<FrameCanvasNodeData>) => {
      const cb = callbacks_ref.current;
      if (cb.read_only) return;
      cb.on_node_moved?.(node.data.node_id, node.position.x, node.position.y);
    },
    [],
  );

  const handleSelectionChange = React.useCallback(
    ({ nodes, edges }: { nodes: RFNode<FrameCanvasNodeData>[]; edges: Array<{ id: string }> }) => {
      callbacks_ref.current.onSelectionChange?.(
        nodes.map((n) => n.data.node_id),
        edges.map((e) => e.id),
      );
    },
    [],
  );

  // Clicking an edge directly should route through onSelectionChange so the
  // inspector can switch to edge-mode (V-FR-3 lives on edges, not nodes —
  // without this handler InspectorEdge is unreachable). React Flow does
  // emit onSelectionChange for edge clicks, but the call sometimes coalesces
  // with the prior nodes-only selection; we forward synchronously here.
  const handleEdgeClick = React.useCallback((_: React.MouseEvent, edge: { id: string }) => {
    const cb = callbacks_ref.current;
    if (!cb.read_only) cb.onSelectionChange?.([], [edge.id]);
  }, []);

  // P1: handleConnect fires BEFORE handleConnectEnd, so last_connect_position
  // was null when on_edge_created tried to use it — the popup opened at
  // window center instead of near the drop. We now stash the validated
  // connection here and fire on_edge_created from handleConnectEnd, by
  // which point we have a drop position.
  const pending_connection = React.useRef<{ source: NodeRef; target: NodeRef } | null>(null);

  const handleConnect = React.useCallback((connection: Connection) => {
    const cb = callbacks_ref.current;
    if (cb.read_only) return;
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) return;
    pending_connection.current = {
      source: connection.source as NodeRef,
      target: connection.target as NodeRef,
    };
  }, []);

  // Palette drag-drop handlers. The left-pane palette sets a custom MIME
  // payload (application/argmap-palette-node) on dragstart; we accept the
  // drop here, translate the screen coords into canvas coords via
  // screenToFlowPosition, and forward to on_palette_drop.
  const handleCanvasDragOver = React.useCallback((event: React.DragEvent) => {
    if (event.dataTransfer.types.includes("application/argmap-palette-node")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleCanvasDrop = React.useCallback(
    (event: React.DragEvent) => {
      const cb = callbacks_ref.current;
      if (cb.read_only) return;
      const data = event.dataTransfer.getData("application/argmap-palette-node");
      if (!data) return;
      event.preventDefault();
      try {
        const parsed = JSON.parse(data) as { kind: string; node_type: string };
        if (parsed.kind !== "palette_node_type" || !parsed.node_type) return;
        const flow_position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        cb.on_palette_drop?.(parsed.node_type, flow_position);
      } catch {
        // Malformed payload — silently no-op rather than throwing into render.
      }
    },
    [screenToFlowPosition],
  );

  const handleConnectEnd = React.useCallback((event: MouseEvent | TouchEvent) => {
    const point =
      "clientX" in event
        ? { x: event.clientX, y: event.clientY }
        : event.changedTouches && event.changedTouches[0]
          ? { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }
          : null;
    if (pending_connection.current) {
      callbacks_ref.current.on_edge_created?.(
        pending_connection.current.source,
        pending_connection.current.target,
        point ?? undefined,
      );
      pending_connection.current = null;
    }
  }, []);

  // Clear pending_connection on pointercancel / window blur. iOS can fire
  // pointercancel mid-drag (e.g., the user opens Control Center), and
  // without this cleanup the next drag-start would call on_edge_created
  // with stale source/target ids — a phantom edge that didn't come from
  // the user's current gesture.
  React.useEffect(() => {
    function clear() {
      pending_connection.current = null;
    }
    window.addEventListener("pointercancel", clear);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("pointercancel", clear);
      window.removeEventListener("blur", clear);
    };
  }, []);

  // P1: keyboard delete. React Flow's deleteKeyCode (default Backspace +
  // Delete) emits onNodesDelete / onEdgesDelete when the user presses one
  // with a selection. We forward both as cascade-delete requests for nodes
  // and direct edge removals for edges.
  const handleNodesDelete = React.useCallback((deleted_nodes: RFNode<FrameCanvasNodeData>[]) => {
    const cb = callbacks_ref.current;
    if (cb.read_only) return;
    for (const n of deleted_nodes) cb.on_node_delete_requested?.(n.data.node_id);
  }, []);
  const handleEdgesDelete = React.useCallback((deleted_edges: RFEdge<FrameCanvasEdgeData>[]) => {
    const cb = callbacks_ref.current;
    if (cb.read_only) return;
    for (const e of deleted_edges) {
      // Skip overlay / option synthetic ids.
      if (e.id.startsWith("overlay_") || e.id.startsWith("checkpoint_option_")) continue;
      cb.on_edge_delete_requested?.(e.id);
    }
  }, []);

  // §13 #4: describe the canvas region + keyboard model for AT users. The
  // wrapper div carries the role="application" + aria-label so the canvas
  // appears as a single named landmark; the inner ReactFlow has its own
  // role="application" but no descriptive label.
  const keyboard_help_id = React.useId();
  const edge_mode_status_id = React.useId();

  // §13 #6: keyboard edge-creation mode. Source is the focused node when
  // the user presses "E"; candidate_index points into the ordered candidate
  // list (all non-source nodes, in DOM order). Arrow keys cycle the
  // candidate, Enter commits, Escape cancels.
  const [edge_mode, setEdgeMode] = React.useState<{
    source: NodeRef;
    candidate_index: number;
  } | null>(null);

  // Build candidate id list from rf_nodes minus the source. We use rf_nodes
  // (the live render state) so candidates reflect the user's current view
  // — collapsed sub-questions stay out, the source itself is excluded.
  const edge_candidates = React.useMemo<ReadonlyArray<NodeRef>>(() => {
    if (!edge_mode) return [];
    return rf_nodes.filter((n) => n.id !== edge_mode.source).map((n) => n.id as NodeRef);
  }, [edge_mode, rf_nodes]);

  const current_candidate: NodeRef | null =
    edge_mode && edge_candidates.length > 0
      ? (edge_candidates[edge_mode.candidate_index % edge_candidates.length] ?? null)
      : null;

  const wrapper_ref = React.useRef<HTMLDivElement | null>(null);
  const focus_before_edge_mode = React.useRef<HTMLElement | null>(null);

  // Effect: paint data-edge-source / data-edge-candidate on the
  // corresponding RF node wrappers so the CSS rings light up. We do this
  // via DOM mutation rather than RFNode.domAttributes to avoid re-deriving
  // rf_nodes on every arrow keypress (which would also re-run RF's heavy
  // node-reconciliation). The dataset writes are idempotent and trivially
  // cheap.
  React.useEffect(() => {
    const root = wrapper_ref.current;
    if (!root) return;
    const all = root.querySelectorAll<HTMLElement>("[data-id]");
    for (const el of all) {
      const nid = el.dataset.id;
      if (!nid) continue;
      const want_source = edge_mode?.source === nid;
      const want_candidate = current_candidate === nid;
      if (want_source) el.setAttribute("data-edge-source", "true");
      else el.removeAttribute("data-edge-source");
      if (want_candidate) el.setAttribute("data-edge-candidate", "true");
      else el.removeAttribute("data-edge-candidate");
    }
    return () => {
      // On unmount or before next pass, sweep our attrs off so a stale
      // ring doesn't linger when edge_mode clears.
      if (!root.isConnected) return;
      for (const el of root.querySelectorAll<HTMLElement>(
        "[data-edge-source],[data-edge-candidate]",
      )) {
        el.removeAttribute("data-edge-source");
        el.removeAttribute("data-edge-candidate");
      }
    };
  }, [edge_mode?.source, current_candidate]);

  // Effect: move keyboard focus to the current candidate so RF's
  // auto-pan-on-node-focus brings it into view AND screen readers announce
  // it. Skipped when edge_mode is null or there is no candidate.
  React.useEffect(() => {
    if (!current_candidate) return;
    const el = document.querySelector<HTMLElement>(`[data-id="${current_candidate}"]`);
    el?.focus();
  }, [current_candidate]);

  // Stable refs so the capture-phase keydown handler (installed once) can
  // read the latest edge mode and candidate list without being torn down
  // on every state change.
  const edge_mode_ref = React.useRef<{
    edge_mode: typeof edge_mode;
    edge_candidates: ReadonlyArray<NodeRef>;
    current_candidate: NodeRef | null;
    read_only: boolean;
  }>({ edge_mode, edge_candidates, current_candidate, read_only });
  edge_mode_ref.current = { edge_mode, edge_candidates, current_candidate, read_only };

  // §13 #6: capture-phase keydown listener on the wrapper. We install it
  // natively (not via React's onKeyDown) so we receive the event BEFORE it
  // reaches the inner React Flow node wrapper, which would otherwise
  // consume arrow keys to move the focused node — incompatible with our
  // arrow-key-cycle-candidate behavior. stopPropagation also prevents RF's
  // built-in arrow handler from running.
  React.useEffect(() => {
    const el = wrapper_ref.current;
    if (!el) return;
    const handler = (event: KeyboardEvent) => {
      const ctx = edge_mode_ref.current;
      if (ctx.read_only) return;

      // Ignore key events from form controls (text inputs in the toolbar
      // search box, etc.) so typing doesn't trigger edge mode.
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;

      if (!ctx.edge_mode) {
        // Enter edge mode: focused node becomes source.
        if (event.key === "e" || event.key === "E") {
          if (event.metaKey || event.ctrlKey || event.altKey) return;
          const node_el =
            (document.activeElement as HTMLElement | null)?.closest<HTMLElement>("[data-id]") ??
            null;
          const source_id = node_el?.dataset.id;
          if (!source_id) return;
          event.preventDefault();
          event.stopPropagation();
          focus_before_edge_mode.current = node_el;
          setEdgeMode({ source: source_id as NodeRef, candidate_index: 0 });
        }
        return;
      }

      // In edge mode.
      const cb = callbacks_ref.current;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setEdgeMode(null);
        // Restore focus to the source so the user can keep working without
        // losing their place in the canvas.
        const restore = focus_before_edge_mode.current;
        focus_before_edge_mode.current = null;
        if (restore && restore.isConnected) {
          requestAnimationFrame(() => restore.focus());
        }
        return;
      }
      if (event.key === "Enter") {
        if (!ctx.current_candidate) return;
        event.preventDefault();
        event.stopPropagation();
        const src = ctx.edge_mode.source;
        const tgt = ctx.current_candidate;
        setEdgeMode(null);
        focus_before_edge_mode.current = null;
        cb.on_edge_created?.(src, tgt);
        return;
      }
      const forward =
        event.key === "ArrowRight" ||
        event.key === "ArrowDown" ||
        (event.key === "Tab" && !event.shiftKey);
      const backward =
        event.key === "ArrowLeft" ||
        event.key === "ArrowUp" ||
        (event.key === "Tab" && event.shiftKey);
      if (forward || backward) {
        if (ctx.edge_candidates.length === 0) return;
        event.preventDefault();
        event.stopPropagation();
        const delta = forward ? 1 : -1;
        setEdgeMode((m) =>
          m
            ? {
                ...m,
                candidate_index:
                  (m.candidate_index + delta + ctx.edge_candidates.length) %
                  ctx.edge_candidates.length,
              }
            : null,
        );
      }
    };
    el.addEventListener("keydown", handler, true);
    return () => el.removeEventListener("keydown", handler, true);
  }, []);

  return (
    <div
      ref={wrapper_ref}
      data-testid="frame-canvas"
      data-read-only={read_only}
      data-edge-mode={edge_mode ? "true" : undefined}
      style={{ width: "100%", height: "100%", position: "relative" }}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
      aria-label={
        read_only
          ? "Frame canvas (read-only). Use Tab to move focus between nodes."
          : "Frame canvas. Use Tab to focus a node, Enter to select, arrow keys to move the selected node, Shift+arrow for larger steps, Delete to remove, E to start an edge from the focused node, and Escape to deselect."
      }
      aria-describedby={keyboard_help_id}
    >
      <span id={keyboard_help_id} className="argmap-sr-only">
        Frame canvas.{" "}
        {read_only
          ? "Read-only."
          : "Press E with a focused node to start an edge to another node; arrow keys then cycle candidate targets; Enter commits, Escape cancels."}
      </span>
      {edge_mode && (
        <div
          data-testid="edge-mode-banner"
          id={edge_mode_status_id}
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            top: "var(--space-3)",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "var(--space-2) var(--space-3)",
            background: "var(--color-mode-current-accent-bg)",
            color: "var(--color-text-primary)",
            border: "var(--border-medium) solid var(--color-mode-current-accent)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-sm)",
            zIndex: "var(--z-banner, 80)" as unknown as number,
            boxShadow: "var(--shadow-md)",
            pointerEvents: "none",
          }}
        >
          {edge_candidates.length === 0
            ? "Edge mode — no candidate nodes. Press Escape to cancel."
            : `Edge mode — arrow keys cycle target, Enter to connect, Escape to cancel. Candidate ${
                (edge_mode.candidate_index % edge_candidates.length) + 1
              } of ${edge_candidates.length}.`}
        </div>
      )}
      <ReactFlow
        nodes={rf_nodes}
        edges={rf_edges}
        nodeTypes={nodeTypes as never}
        edgeTypes={edgeTypes as never}
        onNodesChange={onNodesChange as never}
        onEdgesChange={onEdgesChange as never}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick as never}
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
        // xyflow's MIT licence requires the attribution badge to remain
        // visible unless a Pro subscription has been purchased. Suppressing
        // it without a Pro key is a licence violation; the project has not
        // bought one (yet), so render the badge.
        style={{ background: "var(--color-surface-canvas)" }}
      >
        {/* Dot grid gap matches --canvas-grid-gap in tokens.css. The grid
            is dense enough that nodes appear to "float" on it without the
            grid reading as gridded paper. */}
        <Background gap={CANVAS_GRID_GAP} size={1} color={bg_dot_color} />
        <EdgeMarkerDefs />
        <CanvasMinimap />
        <CanvasToolbar
          foreclosure_visibility={fc_visibility}
          onForeclosureVisibilityChange={setFcVisibility}
          onSearch={setSearchQuery}
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
