import type { EdgeType } from "@/schema";

export type ForeclosureVisibility = "visible" | "dimmed" | "hidden";

export interface FrameCanvasEdgeData {
  [key: string]: unknown;
  edge_type: EdgeType | "checkpoint_option";
  label?: string;
  gate_glyph?: "∧" | "∨" | "¬" | "→" | "⊘";
  gate_indeterminate?: boolean;
  weight_tier?: 0 | 1 | 2 | 3 | 4 | 5;
  foreclosure_visibility?: ForeclosureVisibility;
  option_label?: string;
}
