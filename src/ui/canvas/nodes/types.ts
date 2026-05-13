import type { NodeRef } from "@/schema";
import type { NodeStatus } from "@/schema";
import type { HookInvocationRecord } from "@/llm-hooks";

export type NodeFrameVariant =
  | "root_question"
  | "sub_question"
  | "term"
  | "interpretation"
  | "checkpoint"
  | "logical_gate"
  | "conclusion"
  | "authority"
  | "premise_pill";

export interface NodeDisplayFlags {
  selected: boolean;
  hovered: boolean;
  not_applicable_dim: boolean;
  foreclosed_strikethrough: boolean;
  recommended_next_pulse: boolean;
  indeterminate_gate_dashed: boolean;
  /**
   * P0-17: this node sits on the primary path through to the conclusion.
   * On-path nodes render at full saturation; off-active-set nodes apply a
   * desaturation/opacity filter (the "heatmap" steady state) so the
   * resolving path stands out from the rest of the graph.
   */
  on_primary_path?: boolean;
  /**
   * P0-17: this node is NOT in compute_result.active_set — the runtime
   * decided it doesn't contribute to the resolution. Render desaturated.
   */
  off_active_set?: boolean;
}

export interface FrameCanvasNodeData {
  [key: string]: unknown;
  node_id: NodeRef;
  primary_text: string;
  variant: NodeFrameVariant;
  status?: NodeStatus;
  attributions?: ReadonlyArray<HookInvocationRecord>;
  display: NodeDisplayFlags;
  gate_glyph?: "∧" | "∨" | "¬" | "→" | "⊘";
  authority_binding_kind?: "binding" | "persuasive";
  enable_connector_handle: boolean;
  legal_mode: boolean;
}
