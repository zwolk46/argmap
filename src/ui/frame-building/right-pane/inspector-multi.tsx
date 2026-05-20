import type { ReactElement } from "react";
import type { NodeRef, EdgeRef } from "@/schema";
import { useFrameStore } from "@/state";
import { Button } from "#components/ui/button";
import { Separator } from "#components/ui/separator";

export interface InspectorMultiProps {
  node_ids: ReadonlyArray<NodeRef>;
  edge_ids: ReadonlyArray<EdgeRef>;
  on_request_delete_multi: (node_ids: ReadonlyArray<NodeRef>) => void;
}

export function InspectorMulti(props: InspectorMultiProps): ReactElement {
  const { node_ids, edge_ids, on_request_delete_multi } = props;
  const frame_version = useFrameStore((s) => s.frame_version);

  const node_count = node_ids.length;
  const edge_count = edge_ids.length;

  const node_types = frame_version
    ? [
        ...new Set(
          node_ids.map((id) => frame_version.nodes.find((n) => n.id === id)?.type).filter(Boolean),
        ),
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-1 pb-3">
        <div className="text-sm font-medium">Multi-selection</div>
        <div className="text-xs text-muted-foreground">
          {node_count > 0 && `${node_count} node${node_count !== 1 ? "s" : ""}`}
          {node_count > 0 && edge_count > 0 && ", "}
          {edge_count > 0 && `${edge_count} edge${edge_count !== 1 ? "s" : ""}`}
          {" selected"}
        </div>
        {node_types.length > 0 && (
          <div className="text-xs text-muted-foreground/80">Types: {node_types.join(", ")}</div>
        )}
      </div>
      <Separator />

      {/* Bulk delete */}
      {node_count > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Bulk actions
          </h3>
          <Button variant="destructive" onClick={() => on_request_delete_multi(node_ids)}>
            Delete {node_count} node{node_count !== 1 ? "s" : ""}
            {edge_count > 0 ? ` and ${edge_count} edge${edge_count !== 1 ? "s" : ""}` : ""}
          </Button>
        </div>
      )}

      {/* Hint */}
      <div className="text-xs text-muted-foreground/80">
        Select a single item to edit its properties.
      </div>
    </div>
  );
}
