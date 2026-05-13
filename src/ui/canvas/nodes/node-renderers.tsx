import type { ReactElement } from "react";
import type { NodeProps, Node as RFNode } from "@xyflow/react";
import type { NodeType } from "@/schema";
import { NodeFrame } from "./node-frame";
import type { FrameCanvasNodeData } from "./types";
import { Pill } from "../../primitives/pill";

type ND = RFNode<FrameCanvasNodeData>;

function makeNodeRenderer(
  variant: FrameCanvasNodeData["variant"],
  node_type: NodeType | "premise_pill",
) {
  return function NodeRenderer({ data, selected }: NodeProps<ND>): ReactElement {
    return (
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
    );
  };
}

export const RootQuestionNode = makeNodeRenderer("root_question", "RootQuestion");
export const SubQuestionNode = makeNodeRenderer("sub_question", "SubQuestion");
export const TermNode = makeNodeRenderer("term", "Term");
export const InterpretationNode = makeNodeRenderer("interpretation", "Interpretation");
export const CheckpointNode = makeNodeRenderer("checkpoint", "Checkpoint");

export function LogicalGateNode({ data, selected }: NodeProps<ND>): ReactElement {
  return (
    <NodeFrame
      node_id={data.node_id}
      node_type="LogicalGate"
      status={data.status}
      attributions={data.attributions}
      primary_text={data.primary_text}
      variant="logical_gate"
      display={{ ...data.display, selected: selected ?? data.display.selected }}
      enable_connector_handle={data.enable_connector_handle}
      legal_mode={data.legal_mode}
    >
      <span
        style={{
          fontSize: "var(--font-size-lg)",
          fontWeight: "var(--font-weight-semibold)",
          color: "var(--color-text-primary)",
        }}
      >
        {data.gate_glyph ?? "⊕"}
      </span>
    </NodeFrame>
  );
}

export const ConclusionNode = makeNodeRenderer("conclusion", "Conclusion");

export function AuthorityNode({ data, selected }: NodeProps<ND>): ReactElement {
  return (
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
    >
      {data.legal_mode && data.authority_binding_kind && (
        <div style={{ marginTop: "var(--space-1)" }}>
          <Pill
            size="xs"
            bg={
              data.authority_binding_kind === "binding"
                ? "var(--color-subflag-binding-bg)"
                : "var(--color-subflag-persuasive-bg)"
            }
            color={
              data.authority_binding_kind === "binding"
                ? "var(--color-subflag-binding)"
                : "var(--color-subflag-persuasive)"
            }
          >
            {data.authority_binding_kind === "binding" ? "⚖ Binding" : "⚖ Persuasive"}
          </Pill>
        </div>
      )}
    </NodeFrame>
  );
}

export function PremisePill({ data, selected }: NodeProps<ND>): ReactElement {
  return (
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
  );
}
