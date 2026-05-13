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
  /**
   * P0-17: this overlay edge sits on the primary path through to the
   * conclusion. Primary-path edges render solid in the path-color with a
   * one-shot fade-in trace animation; off-path overlay edges keep the
   * existing static dotted treatment so the resolving path stands out.
   */
  on_primary_path?: boolean;
  /**
   * Position in the trace sequence (0-indexed). Used to stagger each
   * edge's animation by ~120ms × path_index so the trace draws in order
   * from source toward conclusion rather than all at once.
   */
  path_index?: number;
  /**
   * Hash of the primary-path sequence. When the path changes (or settles
   * for the first time) the fingerprint changes; FrameCanvas uses it as a
   * React key on overlay edges so the animation replays from the start.
   */
  path_fingerprint?: string;
}
