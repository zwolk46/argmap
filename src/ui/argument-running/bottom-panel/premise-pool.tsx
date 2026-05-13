import * as React from "react";
import type { Premise } from "@/schema";
import { useSessionStore, useRepository } from "@/state";
import { PremiseRow } from "./premise-row";

export interface PremisePoolProps {
  on_highlight_on_canvas?: (node_ids: ReadonlyArray<string>) => void;
}

export function PremisePool(props: PremisePoolProps): React.ReactElement {
  const { session_store, now, generateId } = useRepository();
  const premises: Premise[] = useSessionStore((s) => s.session?.premises ?? []);

  const [newly_added_id, setNewlyAddedId] = React.useState<string | null>(null);

  const sorted = [...premises].sort((a, b) => a.id.localeCompare(b.id));

  function on_add(): void {
    const id = generateId();
    const ts = now();
    const premise: Premise = {
      id,
      type: "Premise",
      layer: "argument",
      statement: "",
      kind: "found",
      created_at: ts,
      updated_at: ts,
    };
    session_store.getState().applyPatch({ kind: "premise_added", premise });
    setNewlyAddedId(id);
  }

  return (
    <div
      data-testid="premise-pool"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-2, 8px)",
          borderBottom: "var(--border-thin) solid var(--color-border-tertiary)",
        }}
      >
        <span
          style={{
            fontSize: "var(--font-size-xs, 11px)",
            color: "var(--color-text-secondary, #6b7280)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Premises ({sorted.length})
        </span>
        <button
          type="button"
          data-testid="premise-add"
          onClick={on_add}
          style={{
            background: "var(--color-background-accent, #dbeafe)",
            color: "var(--color-text-accent, #1d4ed8)",
            border: "none",
            borderRadius: "var(--border-radius-md, 6px)",
            cursor: "pointer",
            fontSize: "var(--font-size-xs, 11px)",
            padding: "2px 8px",
          }}
        >
          + Add Premise
        </button>
      </header>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {sorted.length === 0 ? (
          <div
            data-testid="premise-pool-empty"
            style={{
              padding: "var(--space-3, 12px)",
              fontSize: "var(--font-size-xs, 11px)",
              color: "var(--color-text-tertiary, #9ca3af)",
            }}
          >
            No premises yet — premises represent the factual or contextual claims your argument
            relies on.
          </div>
        ) : (
          sorted.map((p) => (
            <PremiseRow
              key={p.id}
              premise_id={p.id}
              initial_inline_edit={p.id === newly_added_id}
              on_highlight_on_canvas={props.on_highlight_on_canvas}
            />
          ))
        )}
      </div>
    </div>
  );
}
