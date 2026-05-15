import * as React from "react";
import type { ReactElement } from "react";
import type { NodeRef, EdgeRef } from "@/schema";
import { Button } from "../primitives";
import { CompareEntryRow, type CompareEntryRowDescriptor } from "./compare-entry-row";

export type CompareEntryListKind = "added" | "removed" | "edited" | "layout_only" | "metadata";

export interface CompareEntryListProps {
  title: string;
  kind: CompareEntryListKind;
  entries: ReadonlyArray<CompareEntryRowDescriptor>;
  on_navigate_to_entity: (ref: NodeRef | EdgeRef) => void;
}

function colorForKind(kind: CompareEntryListKind): string {
  switch (kind) {
    case "added":
      return "var(--color-status-satisfied)";
    case "removed":
      return "var(--color-severity-error)";
    case "edited":
      return "var(--color-status-contested)";
    case "layout_only":
      return "var(--color-text-tertiary)";
    case "metadata":
      return "var(--color-text-secondary)";
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
      style={{ borderTop: "var(--border-hairline) solid var(--color-border-subtle)" }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-3)",
        }}
      >
        <span
          data-testid="compare-entry-list-title"
          className="argmap-section-heading"
          style={{ color }}
        >
          {title} ({entries.length})
        </span>
        {kind === "layout_only" ? (
          <Button
            variant="ghost"
            size="sm"
            data-testid="compare-entry-list-expand"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            style={{ marginLeft: "auto" }}
          >
            {expanded ? "Collapse" : "Expand"}
          </Button>
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
