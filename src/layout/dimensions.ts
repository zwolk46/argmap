import type { NodeType } from "@/schema";

export interface NodeDimension {
  width: number;
  height: number;
}

// Premise lives on ArgumentSessionVersion, never on FrameVersion; it has no
// layout-time dimension entry. Callers that encounter a Premise in frame.nodes
// (should not happen, but defensive) call dimensionsFor and get a TS error,
// handled via explicit type narrowing in frameToElkGraph.
export const NODE_DIMENSIONS: Record<Exclude<NodeType, "Premise">, NodeDimension> = {
  RootQuestion: { width: 280, height: 80 },
  SubQuestion: { width: 240, height: 64 },
  Term: { width: 200, height: 56 },
  Interpretation: { width: 200, height: 56 },
  Checkpoint: { width: 220, height: 72 },
  LogicalGate: { width: 80, height: 80 },
  Conclusion: { width: 300, height: 96 },
  Authority: { width: 220, height: 72 },
};

export function dimensionsFor(node_type: Exclude<NodeType, "Premise">): NodeDimension {
  return NODE_DIMENSIONS[node_type];
}
