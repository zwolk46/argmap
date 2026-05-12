import ELK from "elkjs/lib/elk.bundled.js";
import type { FrameVersion } from "@/schema";
import { frameToElkGraph, elkResultToLayoutResult, type ElkResult } from "./elk-mapping";
import {
  resolveLayoutDeps,
  resolveLayoutOptions,
  type LayoutDeps,
  type LayoutOptions,
  type LayoutResult,
} from "./types";

export async function runLayoutSync(
  frame: FrameVersion,
  opts?: Partial<LayoutOptions>,
  deps?: LayoutDeps,
  warnings?: string[],
): Promise<LayoutResult> {
  const resolvedDeps = resolveLayoutDeps(deps);
  const resolvedOpts = resolveLayoutOptions(opts);
  const computed_at = resolvedDeps.now();
  const elkGraph = frameToElkGraph(frame, opts, warnings);
  const elk = new ELK();
  const elkResult = (await elk.layout(elkGraph)) as ElkResult;
  const result = elkResultToLayoutResult(elkResult, computed_at);

  // ELK layered uses anchor hints for ordering but cannot guarantee exact positions.
  // Post-process: for nodes with user-set x/y and honor_user_anchors enabled, pin
  // them back to their exact anchor coordinates so callers can rely on the guarantee.
  if (resolvedOpts.honor_user_anchors) {
    for (const n of frame.nodes) {
      const px = n.presentation?.x;
      const py = n.presentation?.y;
      if (typeof px === "number" && typeof py === "number") {
        const pos = result.positions.find((p) => p.node_id === n.id);
        if (pos) {
          pos.x = px;
          pos.y = py;
        }
      }
    }
  }

  return result;
}
