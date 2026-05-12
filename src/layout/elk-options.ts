import type { LayoutOptions } from "./types";

export const ELK_LAYERED_OPTIONS: Readonly<Record<string, string>> = Object.freeze({
  "elk.algorithm": "layered",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.layered.spacing.nodeNodeBetweenLayers": "80",
  "elk.spacing.nodeNode": "48",
  "elk.spacing.edgeNode": "32",
  "elk.spacing.edgeEdge": "16",
  "elk.padding": "[top=24,left=24,bottom=24,right=24]",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.layered.thoroughness": "7",
});

export function elkDirectionOptions(direction: LayoutOptions["direction"]): Record<string, string> {
  return { "elk.direction": direction };
}
