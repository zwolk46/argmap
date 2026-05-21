import type { ReactElement } from "react";
import { Plus, Minus, PencilSimple } from "@phosphor-icons/react";
import type { NodeRef, EdgeRef } from "@/schema";
import { TypeIcon } from "../primitives";
import { cn } from "#lib/utils";

export type CompareEntryRowDescriptor =
  | { kind: "node_added"; node_id: NodeRef; node_type: string; statement_preview: string }
  | { kind: "node_removed"; node_id: NodeRef; node_type: string; statement_preview: string }
  | {
      kind: "node_edited";
      node_id: NodeRef;
      node_type: string;
      statement_preview: string;
      fields_changed: ReadonlyArray<string>;
    }
  | { kind: "edge_added"; edge_id: EdgeRef; edge_type: string; endpoints_preview: string }
  | { kind: "edge_removed"; edge_id: EdgeRef; edge_type: string; endpoints_preview: string }
  | {
      kind: "edge_edited";
      edge_id: EdgeRef;
      edge_type: string;
      endpoints_preview: string;
      fields_changed: ReadonlyArray<string>;
    }
  | { kind: "metadata_changed"; field: string }
  | { kind: "layout_only_summary"; node_count: number };

export interface CompareEntryRowProps {
  descriptor: CompareEntryRowDescriptor;
  on_navigate_to_entity: (ref: NodeRef | EdgeRef) => void;
}

function isClickable(d: CompareEntryRowDescriptor): boolean {
  return (
    d.kind === "node_added" ||
    d.kind === "node_removed" ||
    d.kind === "node_edited" ||
    d.kind === "edge_added" ||
    d.kind === "edge_removed" ||
    d.kind === "edge_edited"
  );
}

const VALID_NODE_TYPES = new Set([
  "RootQuestion",
  "SubQuestion",
  "Term",
  "Interpretation",
  "Checkpoint",
  "LogicalGate",
  "Conclusion",
  "Premise",
  "Authority",
]);

function safeNodeType(t: string): Parameters<typeof TypeIcon>[0]["node_type"] {
  return (VALID_NODE_TYPES.has(t) ? t : "SubQuestion") as Parameters<
    typeof TypeIcon
  >[0]["node_type"];
}

// Lead icon for added/removed/edited rows — Plus/Minus/PencilSimple — with
// the change-status semantic color tokens drawn from existing argmap tokens.
// "metadata_changed" and "layout_only_summary" do not get a status icon
// because they aren't change-of-entity rows.
function StatusIcon({ kind }: { kind: CompareEntryRowDescriptor["kind"] }): ReactElement | null {
  if (kind === "node_added" || kind === "edge_added") {
    return (
      <Plus weight="bold" aria-hidden="true" style={{ color: "var(--color-status-satisfied)" }} />
    );
  }
  if (kind === "node_removed" || kind === "edge_removed") {
    return (
      <Minus weight="bold" aria-hidden="true" style={{ color: "var(--color-severity-error)" }} />
    );
  }
  if (kind === "node_edited" || kind === "edge_edited") {
    return (
      <PencilSimple
        weight="bold"
        aria-hidden="true"
        style={{ color: "var(--color-status-contested)" }}
      />
    );
  }
  return null;
}

export function CompareEntryRow({
  descriptor,
  on_navigate_to_entity,
}: CompareEntryRowProps): ReactElement {
  const clickable = isClickable(descriptor);

  function handleClick(): void {
    if (
      descriptor.kind === "node_added" ||
      descriptor.kind === "node_removed" ||
      descriptor.kind === "node_edited"
    ) {
      on_navigate_to_entity(descriptor.node_id);
    } else if (
      descriptor.kind === "edge_added" ||
      descriptor.kind === "edge_removed" ||
      descriptor.kind === "edge_edited"
    ) {
      on_navigate_to_entity(descriptor.edge_id);
    }
  }

  let typeIcon: ReactElement | null = null;
  let primary: string = "";
  let secondary: string | undefined;

  switch (descriptor.kind) {
    case "node_added":
    case "node_removed":
      typeIcon = <TypeIcon node_type={safeNodeType(descriptor.node_type)} />;
      primary = descriptor.statement_preview || descriptor.node_id;
      break;
    case "node_edited":
      typeIcon = <TypeIcon node_type={safeNodeType(descriptor.node_type)} />;
      primary = descriptor.statement_preview || descriptor.node_id;
      secondary = `(fields: ${descriptor.fields_changed.join(", ")})`;
      break;
    case "edge_added":
    case "edge_removed":
      primary = descriptor.endpoints_preview;
      break;
    case "edge_edited":
      primary = descriptor.endpoints_preview;
      secondary = `(fields: ${descriptor.fields_changed.join(", ")})`;
      break;
    case "metadata_changed":
      primary = descriptor.field;
      break;
    case "layout_only_summary":
      primary = `Layout updated for ${descriptor.node_count} nodes`;
      break;
  }

  return (
    <div
      data-testid="compare-entry-row"
      data-kind={descriptor.kind}
      onClick={clickable ? handleClick : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm text-foreground",
        clickable
          ? "cursor-pointer hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          : "cursor-default",
      )}
    >
      <StatusIcon kind={descriptor.kind} />
      {typeIcon}
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{primary}</span>
      {secondary ? <span className="text-xs text-muted-foreground">{secondary}</span> : null}
    </div>
  );
}
