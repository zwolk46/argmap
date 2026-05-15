import * as React from "react";
import type { NodeRef, Interpretation, Edge } from "@/schema";
import { useRepository } from "@/state";
import { Button } from "../../primitives";
import { PremiseAuthoringSection, type PremiseAuthoringResult } from "./premise-authoring-section";
import { AuthorityAttachmentSection } from "./authority-attachment-section";
import { NotesField } from "./notes-field";

export interface InterpretationItemEditorProps {
  node: Interpretation;
  on_close: () => void;
  on_saved: () => void;
}

export function InterpretationItemEditor(props: InterpretationItemEditorProps): React.ReactElement {
  const { node, on_close, on_saved } = props;
  const { session_store, now, generateId } = useRepository();

  const [direction, setDirection] = React.useState<"SUPPORTS" | "CONTRADICTS">("SUPPORTS");
  const [premise_result, setPremiseResult] = React.useState<PremiseAuthoringResult | null>(null);
  const [authority_id, setAuthorityId] = React.useState<NodeRef | null>(null);
  const [notes, setNotes] = React.useState("");

  const can_save = premise_result !== null;

  function on_save(): void {
    if (!can_save || !premise_result) return;
    const store = session_store.getState();
    let premise_id: string;
    if (premise_result.kind === "new") {
      // P0-16: enrich the new Premise with the editor's Notes + Authority
      // so they actually persist. Reused premises keep their existing
      // notes/authority_ref unchanged.
      const enriched = {
        ...premise_result.premise,
        ...(notes.trim().length > 0 ? { notes } : {}),
        ...(authority_id ? { authority_ref: authority_id } : {}),
      };
      store.applyPatch({ kind: "premise_added", premise: enriched });
      premise_id = enriched.id;
    } else {
      premise_id = premise_result.premise_id;
    }
    const ts = now();
    const edge: Edge =
      direction === "SUPPORTS"
        ? {
            id: generateId(),
            type: "SUPPORTS",
            layer: "argument",
            source: premise_id,
            target: node.id,
            created_at: ts,
            updated_at: ts,
          }
        : {
            id: generateId(),
            type: "CONTRADICTS",
            layer: "argument",
            source: premise_id,
            target: node.id,
            created_at: ts,
            updated_at: ts,
          };
    store.applyPatch({ kind: "argument_edge_added", edge });
    on_saved();
  }

  return (
    <div
      data-testid="interpretation-item-editor"
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && can_save) {
          e.preventDefault();
          on_save();
        } else if (e.key === "Escape") {
          e.preventDefault();
          on_close();
        }
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        padding: "var(--space-3)",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        <h3
          style={{
            margin: 0,
            fontSize: "var(--font-size-base)",
            color: "var(--color-text-primary)",
          }}
        >
          {node.statement}
        </h3>
        <span className="argmap-section-heading">Interpretation</span>
      </header>

      <fieldset
        style={{
          border: "var(--border-thin) solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: "var(--space-2)",
          display: "flex",
          gap: "var(--space-2)",
        }}
      >
        <legend
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-secondary)",
            padding: "0 var(--space-1)",
          }}
        >
          Evidence direction
        </legend>
        <label
          data-testid="evidence-direction-supports"
          style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}
        >
          <input
            type="radio"
            name={`direction-${node.id}`}
            checked={direction === "SUPPORTS"}
            onChange={() => setDirection("SUPPORTS")}
          />
          Supports
        </label>
        <label
          data-testid="evidence-direction-contradicts"
          style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}
        >
          <input
            type="radio"
            name={`direction-${node.id}`}
            checked={direction === "CONTRADICTS"}
            onChange={() => setDirection("CONTRADICTS")}
          />
          Contradicts
        </label>
      </fieldset>

      <PremiseAuthoringSection
        value={premise_result}
        on_change={setPremiseResult}
        default_kind="found"
        reuse_context={node.statement}
      />
      <AuthorityAttachmentSection value={authority_id} on_change={setAuthorityId} />
      <NotesField value={notes} on_change={setNotes} />

      <footer
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "var(--space-1)",
        }}
      >
        <Button
          variant="secondary"
          size="md"
          data-testid="interpretation-editor-cancel"
          onClick={on_close}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          data-testid="interpretation-editor-save"
          onClick={on_save}
          disabled={!can_save}
        >
          Save
        </Button>
      </footer>
    </div>
  );
}
