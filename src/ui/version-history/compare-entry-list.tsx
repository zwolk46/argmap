import * as React from "react";
import type { ReactElement } from "react";
import type { NodeRef, EdgeRef } from "@/schema";
import { CompareEntryRow, type CompareEntryRowDescriptor } from "./compare-entry-row";

export type CompareEntryListKind =
  | "added"
  | "removed"
  | "edited"
  | "layout_only"
  | "metadata";

export interface CompareEntryListProps {
  title: string;
  kind: CompareEntryListKind;
  entries: ReadonlyArray<CompareEntryRowDescriptor>;
  on_navigate_to_entity: (ref: NodeRef | EdgeRef) => void;
}

function colorForKind(kind: CompareEntryListKind): string {
  switch (kind) {
    case "added":
      return "var(--color-status-satisfied, #10b981)";
    case "removed":
      return "var(--color-severity-error, #dc2626)";
    case "edited":
      return "var(--color-status-contested, #d97706)";
    case "layout_only":
      return "var(--color-text-tertiary, #9ca3af)";
    case "metadata":
      return "var(--color-text-secondary, #6b7280)";
  }
}

export function CompareEntryList(props: CompareEntryListProps): ReactElement | null {
  const { title, kind, entries, on_navigate_to_entity } = props;
  const [expanded, setExpanded] = React.useState(kind !== "layout_only");

  if (entries.length === 0) return null;

  const color = colorForKind(kind);

  return (
    <section
      data-testid="compare-entry-list"
      data-kind={kind}
      style={{ borderTop: "var(--border-hairline, 1px) solid var(--color-border-subtle, #e5e7eb)" }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2, 8px)",
          padding: "var(--space-2, 8px) var(--space-3, 12px)",
          color,
          fontSize: "var(--font-size-xs, 11px)",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        <span data-testid="compare-entry-list-title">
          {title} ({entries.length})
        </span>
        {kind === "layout_only" ? (
          <button
            type="button"
            data-testid="compare-entry-list-expand"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            style={{
              marginLeft: "auto",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--color-text-secondary, #6b7280)",
              fontSize: "11px",
            }}
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        ) : null}
      </header>
      {expanded
        ? entries.map((entry, idx) => (
            <CompareEntryRow
              key={`${kind}-${idx}`}
              descriptor={entry}
              on_navigate_to_entity={on_navigate_to_entity}
            />
          ))
        : null}
    </section>
  );
}
