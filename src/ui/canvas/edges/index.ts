import { StructuralEdge } from "./structural-edge";
import { ForeclosesEdge } from "./forecloses-edge";
import { CheckpointOptionEdge } from "./checkpoint-option-edge";
import { ArgumentOverlayEdge } from "./argument-overlay-edge";
import { AnnotationEdge } from "./annotation-edge";
import type { EdgeType } from "@/schema";

export { StructuralEdge } from "./structural-edge";
export { ForeclosesEdge } from "./forecloses-edge";
export { CheckpointOptionEdge } from "./checkpoint-option-edge";
export { ArgumentOverlayEdge } from "./argument-overlay-edge";
export { AnnotationEdge } from "./annotation-edge";
export { validEdgeTypesFor, candidateLabel } from "./edge-validity";
export type { EdgeCreationCandidate, LogicalGateSlot } from "./edge-validity";
export type { FrameCanvasEdgeData, ForeclosureVisibility } from "./types";

export const edgeTypes = {
  DECOMPOSES_INTO: StructuralEdge,
  TURNS_ON: StructuralEdge,
  INTERPRETED_AS: StructuralEdge,
  LEADS_TO: StructuralEdge,
  GATES: StructuralEdge,
  FORECLOSES: ForeclosesEdge,
  ANSWERS: ArgumentOverlayEdge,
  SUPPORTS: ArgumentOverlayEdge,
  CONTRADICTS: ArgumentOverlayEdge,
  CITES: AnnotationEdge,
  DISTINGUISHED_BY: AnnotationEdge,
  checkpoint_option: CheckpointOptionEdge,
} as const;

export function edgeTypeFor(edge_type: EdgeType | "checkpoint_option"): keyof typeof edgeTypes {
  return edge_type as keyof typeof edgeTypes;
}
