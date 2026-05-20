import * as React from "react";
import type { Premise } from "@/schema";
import { useSessionStore, useRepository } from "@/state";
import { InlineEmpty } from "../../primitives";
import { Button } from "#components/ui/button";
import { Plus } from "@phosphor-icons/react";
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
    <div data-testid="premise-pool" className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b p-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Premises ({sorted.length})
        </span>
        <Button type="button" variant="ghost" size="xs" data-testid="premise-add" onClick={on_add}>
          <Plus size={12} />
          Add Premise
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto">
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
