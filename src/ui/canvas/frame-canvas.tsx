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
  on_edge_created?: (source: NodeRef, target: NodeRef, drop_position?: { x: number; y: number }) => void;
  onSelectionChange?: (node_ids: ReadonlyArray<NodeRef>) => void;
  onAutoArrange?: () => void;
  search?: string;
  handle?: React.Ref<FrameCanvasHandle>;
}

function defaultDisplayFlags(
  node_id: NodeRef,
  selection?: ReadonlyArray<NodeRef>,
): NodeDisplayFlags {
  return {
    selected: selection?.includes(node_id) ?? false,
    hovered: false,
    not_applicable_dim: false,
    foreclosed_strikethrough: false,
    recommended_next_pulse: false,
    indeterminate_gate_dashed: false,
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
): RFNode<FrameCanvasNodeData>[] {
  return frame_version.nodes.map((node) => {
    const pos = layout_result?.positions.find((p) => p.node_id === node.id);
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

    const display = defaultDisplayFlags(node.id as NodeRef, selection);
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
          node.type === "LogicalGate" && "gate_type" in node
            ? ((
                {
                  AndGate: "∧",
                  OrGate: "∨",
                  NotGate: "¬",
                  IfThenGate: "→",
                  UnlessGate: "⊘",
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
): RFEdge<FrameCanvasEdgeData>[] {
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
      edges.push({
        id: `overlay_${ae.id}`,
        source: ae.source,
        target: ae.target,
        type: ae.type,
        data: {
          edge_type: ae.type,
          weight_tier: (ae.weight ?? 1) as 0 | 1 | 2 | 3 | 4 | 5,
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
  } = props;

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
  );
  const rf_edges = buildRFEdges(frame_version, operating_mode, fc_visibility, argument_overlay);

  function handleNodeDragStop(_: React.MouseEvent, node: RFNode<FrameCanvasNodeData>) {
    if (read_only) return;
    on_node_moved?.(node.data.node_id, node.position.x, node.position.y);
  }

  function handleSelectionChange({ nodes }: { nodes: RFNode<FrameCanvasNodeData>[] }) {
    onSelectionChange?.(nodes.map((n) => n.data.node_id));
  }

  function handleConnect(connection: Connection) {
    if (read_only) return;
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) return;
    on_edge_created?.(
      connection.source as NodeRef,
      connection.target as NodeRef,
      last_connect_position.current ?? undefined,
    );
    last_connect_position.current = null;
  }

  function handleConnectEnd(event: MouseEvent | TouchEvent) {
    const point =
      "clientX" in event
        ? { x: event.clientX, y: event.clientY }
        : event.changedTouches && event.changedTouches[0]
          ? { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }
          : null;
    last_connect_position.current = point;
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
