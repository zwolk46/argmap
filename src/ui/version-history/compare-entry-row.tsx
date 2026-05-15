import type { ReactElement } from "react";
import type { NodeRef, EdgeRef } from "@/schema";
import { TypeIcon } from "../primitives";

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

  let icon: ReactElement | null = null;
  let primary: string = "";
  let secondary: string | undefined;

  switch (descriptor.kind) {
    case "node_added":
    case "node_removed":
      icon = <TypeIcon node_type={safeNodeType(descriptor.node_type)} />;
      primary = descriptor.statement_preview || descriptor.node_id;
      break;
    case "node_edited":
      icon = <TypeIcon node_type={safeNodeType(descriptor.node_type)} />;
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
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2, 8px)",
        padding: "var(--space-2, 8px) var(--space-3, 12px)",
        fontSize: "var(--font-size-sm, 13px)",
        cursor: clickable ? "pointer" : "default",
        color: "var(--color-text-primary, #111827)",
      }}
    >
      {icon}
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {primary}
      </span>
      {secondary ? (
        <span
          style={{ color: "var(--color-text-secondary, #6b7280)", fontSize: "var(--font-size-xs)" }}
        >
          {secondary}
        </span>
      ) : null}
    </div>
  );
}
