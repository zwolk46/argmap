import type { NodeRef } from "./identifiers";
import type { NodeType } from "./nodes";

export type EdgeType =
  | "DECOMPOSES_INTO"
  | "TURNS_ON"
  | "INTERPRETED_AS"
  | "LEADS_TO"
  | "FORECLOSES"
  | "GATES"
  | "ANSWERS"
  | "SUPPORTS"
  | "CONTRADICTS"
  | "CITES"
  | "BINDING_IN"
  | "DISTINGUISHED_BY";

export interface EdgeBase {
  id: string;
  slug?: string;
  type: EdgeType;
  layer: "frame" | "argument";
  source: NodeRef;
  target: NodeRef;
  label?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ---- Frame-layer structural edges ----
export interface DecomposesIntoEdge extends EdgeBase {
  type: "DECOMPOSES_INTO";
  layer: "frame";
}

export interface TurnsOnEdge extends EdgeBase {
  type: "TURNS_ON";
  layer: "frame";
}

export interface InterpretedAsEdge extends EdgeBase {
  type: "INTERPRETED_AS";
  layer: "frame";
}

export interface LeadsToEdge extends EdgeBase {
  type: "LEADS_TO";
  layer: "frame";
  condition?: string;
}

export interface ForeclosesEdge extends EdgeBase {
  type: "FORECLOSES";
  layer: "frame";
  scope?: "moot" | "decided";
}

export interface GatesEdge extends EdgeBase {
  type: "GATES";
  layer: "frame";
}

// ---- Argument-layer edges ----
export interface AnswersEdge extends EdgeBase {
  type: "ANSWERS";
  layer: "argument";
  selected_option_id: string;
}

export interface SupportsEdge extends EdgeBase {
  type: "SUPPORTS";
  layer: "argument";
  weight?: "strong" | "moderate" | "weak";
}

export interface ContradictsEdge extends EdgeBase {
  type: "CONTRADICTS";
  layer: "argument";
  weight?: "strong" | "moderate" | "weak";
}

// ---- Authority-related frame-layer edges ----
export interface CitesEdge extends EdgeBase {
  type: "CITES";
  layer: "frame";
  strength?: "directly_on_point" | "analogous" | "background";
}

// BINDING_IN: retained in the EdgeType union for switch exhaustiveness but
// never instantiated as an Edge row; the conceptual relation lives on
// Authority.binding_in (Jurisdiction[]). Validators skip BINDING_IN entries.
export interface BindingInEdge extends EdgeBase {
  type: "BINDING_IN";
  layer: "frame";
}

export interface DistinguishedByEdge extends EdgeBase {
  type: "DISTINGUISHED_BY";
  layer: "frame";
  reasoning?: string;
}

export type Edge =
  | DecomposesIntoEdge
  | TurnsOnEdge
  | InterpretedAsEdge
  | LeadsToEdge
  | ForeclosesEdge
  | GatesEdge
  | AnswersEdge
  | SupportsEdge
  | ContradictsEdge
  | CitesEdge
  | BindingInEdge
  | DistinguishedByEdge;

// ---- V-EDGE-1 source data ----
export interface ValidEdgePair {
  source_types: ReadonlyArray<NodeType>;
  target_types: ReadonlyArray<NodeType>;
}

export const VALID_EDGE_PAIRS: Readonly<Record<EdgeType, ValidEdgePair>> = {
  DECOMPOSES_INTO: {
    source_types: ["RootQuestion", "SubQuestion"],
    target_types: ["SubQuestion"],
  },
  TURNS_ON: {
    source_types: ["RootQuestion", "SubQuestion"],
    target_types: ["Term"],
  },
  INTERPRETED_AS: {
    source_types: ["Term"],
    target_types: ["Interpretation"],
  },
  LEADS_TO: {
    source_types: ["Interpretation", "LogicalGate"],
    target_types: ["Checkpoint", "SubQuestion", "Conclusion", "LogicalGate"],
  },
  FORECLOSES: {
    source_types: ["Interpretation"],
    target_types: ["Term", "SubQuestion", "Checkpoint"],
  },
  GATES: {
    source_types: ["LogicalGate"],
    target_types: [
      "RootQuestion",
      "SubQuestion",
      "Term",
      "Interpretation",
      "Checkpoint",
      "LogicalGate",
      "Conclusion",
    ],
  },
  ANSWERS: {
    source_types: ["Premise"],
    target_types: ["Checkpoint"],
  },
  SUPPORTS: {
    source_types: ["Premise"],
    target_types: ["Interpretation", "Conclusion"],
  },
  CONTRADICTS: {
    source_types: ["Premise"],
    target_types: ["Interpretation", "Conclusion", "Checkpoint"],
  },
  CITES: {
    source_types: ["Authority"],
    target_types: ["Interpretation"],
  },
  BINDING_IN: {
    source_types: [],
    target_types: [],
  },
  DISTINGUISHED_BY: {
    source_types: ["Authority"],
    target_types: ["Interpretation"],
  },
};
