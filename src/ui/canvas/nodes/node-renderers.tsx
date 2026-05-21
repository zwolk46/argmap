import type { ReactElement } from "react";
import type { NodeProps, Node as RFNode } from "@xyflow/react";
import type { NodeType } from "@/schema";
import { NodeFrame } from "./node-frame";
import { CanvasNodeContextMenu } from "./canvas-node-context-menu";
import { CanvasNodeHoverCard } from "./canvas-node-hover-card";
import type { FrameCanvasNodeData } from "./types";

type ND = RFNode<FrameCanvasNodeData>;

function makeNodeRenderer(
  variant: FrameCanvasNodeData["variant"],
  node_type: NodeType | "premise_pill",
) {
  return function NodeRenderer({ data, selected }: NodeProps<ND>): ReactElement {
    return (
      <CanvasNodeContextMenu node_id={data.node_id} delete_disabled={node_type === "RootQuestion"}>
        <CanvasNodeHoverCard
          node_type={node_type}
          primary_text={data.primary_text}
          status={data.status}
        >
          <NodeFrame
            node_id={data.node_id}
            node_type={node_type}
            status={data.status}
            attributions={data.attributions}
            primary_text={data.primary_text}
            variant={variant}
            display={{ ...data.display, selected: selected ?? data.display.selected }}
            enable_connector_handle={data.enable_connector_handle}
            legal_mode={data.legal_mode}
          />
        </CanvasNodeHoverCard>
      </CanvasNodeContextMenu>
    );
  };
}

export const RootQuestionNode = makeNodeRenderer("root_question", "RootQuestion");
export const SubQuestionNode = makeNodeRenderer("sub_question", "SubQuestion");
export const TermNode = makeNodeRenderer("term", "Term");
export const InterpretationNode = makeNodeRenderer("interpretation", "Interpretation");
export const CheckpointNode = makeNodeRenderer("checkpoint", "Checkpoint");

export function LogicalGateNode({ data, selected }: NodeProps<ND>): ReactElement {
  // Gate body shows the gate glyph (∧/∨/¬/→/⊘) or, fallback, the primary
  // text label. The new whole-node treatment keeps the gate auto-width and
  // mono-styled via .canvas-node[data-kind="logical_gate"].
  return (
    <CanvasNodeContextMenu node_id={data.node_id}>
      <NodeFrame
        node_id={data.node_id}
        node_type="LogicalGate"
        status={data.status}
        attributions={data.attributions}
        primary_text={data.gate_glyph ?? data.primary_text ?? "⊕"}
        variant="logical_gate"
        display={{ ...data.display, selected: selected ?? data.display.selected }}
        enable_connector_handle={data.enable_connector_handle}
        legal_mode={data.legal_mode}
      />
    </CanvasNodeContextMenu>
  );
}

export const ConclusionNode = makeNodeRenderer("conclusion", "Conclusion");

export function AuthorityNode({ data, selected }: NodeProps<ND>): ReactElement {
  // The binding/persuasive subflag now surfaces inside the .cn-status
  // header as a .cn-subflag chip — we hand it to NodeFrame explicitly
  // (rather than letting it derive from status.via) because the
  // authority's binding kind is a property of the node itself, not of
  // a status path that resolves through it.
  return (
    <CanvasNodeContextMenu node_id={data.node_id}>
      <NodeFrame
        node_id={data.node_id}
        node_type="Authority"
        status={data.status}
        attributions={data.attributions}
        primary_text={data.primary_text}
        variant="authority"
        display={{ ...data.display, selected: selected ?? data.display.selected }}
        enable_connector_handle={data.enable_connector_handle}
        legal_mode={data.legal_mode}
        subflag={data.legal_mode ? data.authority_binding_kind : undefined}
      />
    </CanvasNodeContextMenu>
  );
}

export function PremisePill({ data, selected }: NodeProps<ND>): ReactElement {
  return (
    <CanvasNodeContextMenu node_id={data.node_id}>
      <NodeFrame
        node_id={data.node_id}
        node_type="Premise"
        status={data.status}
        attributions={data.attributions}
        primary_text={data.primary_text}
        variant="premise_pill"
        display={{ ...data.display, selected: selected ?? data.display.selected }}
        enable_connector_handle={false}
        legal_mode={data.legal_mode}
      />
    </CanvasNodeContextMenu>
  );
}
