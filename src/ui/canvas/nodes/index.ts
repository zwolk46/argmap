import type { NodeType } from "@/schema";
import {
  RootQuestionNode,
  SubQuestionNode,
  TermNode,
  InterpretationNode,
  CheckpointNode,
  LogicalGateNode,
  ConclusionNode,
  AuthorityNode,
  PremisePill,
} from "./node-renderers";

export {
  RootQuestionNode,
  SubQuestionNode,
  TermNode,
  InterpretationNode,
  CheckpointNode,
  LogicalGateNode,
  ConclusionNode,
  AuthorityNode,
  PremisePill,
} from "./node-renderers";

export { NodeFrame } from "./node-frame";
export type { NodeFrameProps, NodeFrameVariant, NodeDisplayFlags } from "./node-frame";
export type { FrameCanvasNodeData } from "./types";

export const nodeTypes = {
  RootQuestion: RootQuestionNode,
  SubQuestion: SubQuestionNode,
  Term: TermNode,
  Interpretation: InterpretationNode,
  Checkpoint: CheckpointNode,
  LogicalGate: LogicalGateNode,
  Conclusion: ConclusionNode,
  Authority: AuthorityNode,
  premise_pill: PremisePill,
} as const;

export function nodeTypeFor(node_type: NodeType | "premise_pill"): keyof typeof nodeTypes {
  return node_type as keyof typeof nodeTypes;
}
