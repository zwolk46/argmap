import type { ReactElement } from "react";
import type { EdgeRef, NodeRef, Edge, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Textarea } from "#components/ui/textarea";
import { Label } from "#components/ui/label";
import { Separator } from "#components/ui/separator";
import { EdgeEditor } from "./editors";

function describeNode(nodes: ReadonlyArray<Node>, node_id: NodeRef): string {
  const n = nodes.find((x) => x.id === node_id);
  if (!n) return node_id.slice(0, 8);
  if ("question" in n && typeof n.question === "string") return n.question;
  if ("statement" in n && typeof n.statement === "string") return n.statement;
  if ("name" in n && typeof (n as { name?: unknown }).name === "string")
    return (n as { name: string }).name;
  if ("citation" in n && typeof (n as { citation?: unknown }).citation === "string")
    return (n as { citation: string }).citation;
  return `${n.type} ${node_id.slice(0, 8)}`;
}

function EndpointButton({
  label,
  onClick,
}: {
  node_id: NodeRef;
  label: string;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Jump to ${label}`}
      className="inline-block max-w-40 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap align-bottom text-primary underline decoration-dotted underline-offset-2 hover:text-primary/80"
    >
      {label}
    </button>
  );
}

export interface InspectorEdgeProps {
  edge_id: EdgeRef;
  on_navigate_to_node: (node_id: NodeRef) => void;
}

export function InspectorEdge(props: InspectorEdgeProps): ReactElement {
  const { edge_id, on_navigate_to_node } = props;
  const edge = useFrameStore((s) => s.frame_version?.edges.find((e) => e.id === edge_id));
  // Look up display labels so the source/target buttons read as something
  // human, not as truncated UUIDs.
  const nodes = useFrameStore((s) => s.frame_version?.nodes ?? []);
  const { frame_store } = useRepository();

  if (!edge) {
    return <div className="text-sm text-muted-foreground">Edge not found.</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-col gap-2 pb-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Edge type
          </h3>
          <div className="text-sm font-medium">{edge.type}</div>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Direction
          </h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <EndpointButton
              node_id={edge.source as NodeRef}
              label={describeNode(nodes, edge.source as NodeRef)}
              onClick={() => on_navigate_to_node(edge.source as NodeRef)}
            />
            <span aria-hidden="true">→</span>
            <EndpointButton
              node_id={edge.target as NodeRef}
              label={describeNode(nodes, edge.target as NodeRef)}
              onClick={() => on_navigate_to_node(edge.target as NodeRef)}
            />
          </div>
        </div>
      </div>
      <Separator />

      {/* Label */}
      <div className="flex flex-col gap-1">
        <Label htmlFor={`edge-label-${edge_id}`}>Label</Label>
        <Input
          id={`edge-label-${edge_id}`}
          type="text"
          defaultValue={(edge as { label?: string }).label ?? ""}
          onBlur={(e) => {
            frame_store.getState().applyPatch({
              kind: "edge_edited",
              edge_id,
              partial: { label: e.currentTarget.value } as Partial<Edge>,
            });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
        />
      </div>

      {/* Type-specific fields */}
      <EdgeEditor edge={edge} />

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <Label htmlFor={`edge-notes-${edge_id}`}>Notes</Label>
        <Textarea
          id={`edge-notes-${edge_id}`}
          rows={2}
          defaultValue={(edge as { notes?: string }).notes ?? ""}
          onBlur={(e) => {
            frame_store.getState().applyPatch({
              kind: "edge_edited",
              edge_id,
              partial: { notes: e.currentTarget.value } as Partial<Edge>,
            });
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLTextAreaElement).blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              (e.currentTarget as HTMLTextAreaElement).blur();
            }
          }}
        />
      </div>

      {/* Footer */}
      <Separator />
      <div>
        <Button
          variant="destructive"
          onClick={() => {
            frame_store.getState().applyPatch({ kind: "edge_removed", edge_id });
          }}
        >
          Delete edge
        </Button>
      </div>
    </div>
  );
}
