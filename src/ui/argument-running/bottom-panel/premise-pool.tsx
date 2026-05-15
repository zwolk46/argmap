import * as React from "react";
import type { Premise } from "@/schema";
import { useSessionStore, useRepository } from "@/state";
import { Button, InlineEmpty } from "../../primitives";
import { PremiseRow } from "./premise-row";

export interface PremisePoolProps {
  on_highlight_on_canvas?: (node_ids: ReadonlyArray<string>) => void;
}

// Stable fallback so the Zustand selector below never returns a fresh array.
// (See use-field-attribution.ts for the loop diagnosis.)
const EMPTY_PREMISES: ReadonlyArray<Premise> = [];

export function PremisePool(props: PremisePoolProps): React.ReactElement {
  const { session_store, now, generateId } = useRepository();
  const premises = useSessionStore((s) => s.session?.premises ?? EMPTY_PREMISES);

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
        <span className="argmap-section-heading">Premises ({sorted.length})</span>
        <Button variant="ghost" size="sm" data-testid="premise-add" onClick={on_add}>
          + Add Premise
        </Button>
      </header>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {sorted.length === 0 ? (
          <InlineEmpty testId="premise-pool-empty" density="compact">
            No premises yet — premises represent the factual or contextual claims your argument
            relies on.
          </InlineEmpty>
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
