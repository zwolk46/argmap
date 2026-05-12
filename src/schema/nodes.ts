import type { NodeRef } from "./identifiers";
import type { Jurisdiction } from "./frame";
import type { SatisfactionPolicy } from "./satisfaction-policy";

export type NodeType =
  | "RootQuestion"
  | "SubQuestion"
  | "Term"
  | "Interpretation"
  | "Checkpoint"
  | "LogicalGate"
  | "Conclusion"
  | "Authority"
  | "Premise";

export interface NodeBase {
  id: string;
  slug?: string;
  type: NodeType;
  layer: "frame" | "argument";
  notes?: string;
  // F-003 #5: presentation is nested per Stream B, not flat. Layout reads
  // node.presentation?.collapsed / x / y from here.
  presentation?: {
    x?: number;
    y?: number;
    color_override?: string;
    collapsed?: boolean;
  };
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// ---------- B1.1 RootQuestion ----------
export interface RootQuestion extends NodeBase {
  type: "RootQuestion";
  layer: "frame";
  statement: string;
  standard_of_review?: string;
  options_box?: SatisfactionPolicy;
}

// ---------- B1.2 SubQuestion ----------
export interface SubQuestion extends NodeBase {
  type: "SubQuestion";
  layer: "frame";
  statement: string;
  is_jurisdictional: boolean;
  standard_of_review?: string;
  options_box?: SatisfactionPolicy;
}

// ---------- B1.3 Term ----------
export interface Term extends NodeBase {
  type: "Term";
  layer: "frame";
  name: string;
  order: number;
  dispositive: boolean;
  linked_to?: NodeRef;
  options_box?: SatisfactionPolicy;
}

// ---------- B1.4 Interpretation ----------
export interface Interpretation extends NodeBase {
  type: "Interpretation";
  layer: "frame";
  statement: string;
  jurisdiction_override?: Jurisdiction;
  options_box?: SatisfactionPolicy;
}

// ---------- B1.5 Checkpoint ----------
export type CheckpointAnswerType = "boolean" | "multiple_choice" | "graded";

export interface CheckpointOption {
  id: string;
  label: string;
  target_node_id?: NodeRef;
  satisfies: boolean;
  routes_to_status?: "contested";
}

export type BurdenLevel =
  | "preponderance"
  | "clear_and_convincing"
  | "beyond_reasonable_doubt"
  | "scintilla"
  | "substantial_evidence";

export interface Checkpoint extends NodeBase {
  type: "Checkpoint";
  layer: "frame";
  question: string;
  answer_type: CheckpointAnswerType;
  options: CheckpointOption[];
  requires_premise: boolean;
  requires_authority: boolean;
  burden_level?: BurdenLevel;
  options_box?: SatisfactionPolicy;
}

// ---------- B1.6 LogicalGate (named-slot variants) ----------
export interface AndGate extends NodeBase {
  type: "LogicalGate";
  layer: "frame";
  gate_type: "AND";
  inputs: NodeRef[];
  output_target?: NodeRef;
}

export interface OrGate extends NodeBase {
  type: "LogicalGate";
  layer: "frame";
  gate_type: "OR";
  inputs: NodeRef[];
  output_target?: NodeRef;
}

export interface NotGate extends NodeBase {
  type: "LogicalGate";
  layer: "frame";
  gate_type: "NOT";
  input: NodeRef;
  output_target?: NodeRef;
}

export interface IfThenGate extends NodeBase {
  type: "LogicalGate";
  layer: "frame";
  gate_type: "IF_THEN";
  antecedent: NodeRef;
  consequent: NodeRef;
  output_target?: NodeRef;
}

export interface UnlessGate extends NodeBase {
  type: "LogicalGate";
  layer: "frame";
  gate_type: "UNLESS";
  main: NodeRef;
  exception: NodeRef;
  output_target?: NodeRef;
}

export type LogicalGate = AndGate | OrGate | NotGate | IfThenGate | UnlessGate;
export type GateType = LogicalGate["gate_type"];

// ---------- B1.7 Conclusion ----------
export type ConclusionDirection =
  | {
      kind: "legal";
      value:
        | "favors_plaintiff"
        | "favors_defendant"
        | "affirm"
        | "reverse"
        | "remand"
        | "dismiss"
        | "custom";
      custom_label?: string;
    }
  | {
      kind: "general";
      position_id: string;
      custom_label?: string;
    };

export interface Conclusion extends NodeBase {
  type: "Conclusion";
  layer: "frame";
  statement: string;
  direction: ConclusionDirection;
  reasoning_summary?: string;
  tags?: string[];
  remedy?: string;
  options_box?: SatisfactionPolicy;
}

// ---------- B1.8 Authority ----------
export interface Authority extends NodeBase {
  type: "Authority";
  layer: "frame" | "argument";
  citation: string;
  court?: string;
  year?: number;
  holding_summary?: string;
  is_holding?: boolean;
  is_binding?: boolean;
  jurisdiction?: Jurisdiction;
  binding_in?: Jurisdiction[];
  author?: string;
  venue?: string;
  position?: string;
  url?: string;
  short_label?: string;
}

// ---------- B1.9 Premise ----------
export type PremiseKind =
  | "stipulated"
  | "found"
  | "disputed"
  | "procedural"
  | "empirical"
  | "definitional"
  | "normative"
  | "observation"
  | "value"
  | "assumption";

export interface Premise extends NodeBase {
  type: "Premise";
  layer: "argument";
  statement: string;
  kind: PremiseKind;
  source?: string;
  authority_ref?: NodeRef;
}

// ---------- Node union and type guards ----------
export type Node =
  | RootQuestion
  | SubQuestion
  | Term
  | Interpretation
  | Checkpoint
  | LogicalGate
  | Conclusion
  | Authority
  | Premise;

export function isRootQuestion(n: Node): n is RootQuestion {
  return n.type === "RootQuestion";
}
export function isSubQuestion(n: Node): n is SubQuestion {
  return n.type === "SubQuestion";
}
export function isTerm(n: Node): n is Term {
  return n.type === "Term";
}
export function isInterpretation(n: Node): n is Interpretation {
  return n.type === "Interpretation";
}
export function isCheckpoint(n: Node): n is Checkpoint {
  return n.type === "Checkpoint";
}
export function isLogicalGate(n: Node): n is LogicalGate {
  return n.type === "LogicalGate";
}
export function isConclusion(n: Node): n is Conclusion {
  return n.type === "Conclusion";
}
export function isAuthority(n: Node): n is Authority {
  return n.type === "Authority";
}
export function isPremise(n: Node): n is Premise {
  return n.type === "Premise";
}

export function isAndGate(g: LogicalGate): g is AndGate {
  return g.gate_type === "AND";
}
export function isOrGate(g: LogicalGate): g is OrGate {
  return g.gate_type === "OR";
}
export function isNotGate(g: LogicalGate): g is NotGate {
  return g.gate_type === "NOT";
}
export function isIfThenGate(g: LogicalGate): g is IfThenGate {
  return g.gate_type === "IF_THEN";
}
export function isUnlessGate(g: LogicalGate): g is UnlessGate {
  return g.gate_type === "UNLESS";
}

// V-GATE-5 / V-GATE-6 input policy.
export function isBooleanEvaluable(n: Node): boolean {
  return (
    n.type === "Checkpoint" ||
    n.type === "Interpretation" ||
    n.type === "SubQuestion" ||
    n.type === "RootQuestion" ||
    n.type === "LogicalGate"
  );
}
