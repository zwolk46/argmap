import * as React from "react";
import type { NodeRef, Interpretation, Edge } from "@/schema";
import { useRepository } from "@/state";
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
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3, 12px)",
        padding: "var(--space-3, 12px)",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-1, 4px)" }}>
        <h3
          style={{
            margin: 0,
            fontSize: "var(--font-size-base, 14px)",
            color: "var(--color-text-primary, #111827)",
          }}
        >
          {node.statement}
        </h3>
        <span
          style={{
            fontSize: "10px",
            color: "var(--color-text-tertiary, #9ca3af)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Interpretation
        </span>
      </header>

      <fieldset
        style={{
          border: "var(--border-thin) solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md, 6px)",
          padding: "var(--space-2, 8px)",
          display: "flex",
          gap: "var(--space-2, 8px)",
        }}
      >
        <legend
          style={{
            fontSize: "var(--font-size-xs, 11px)",
            color: "var(--color-text-secondary, #6b7280)",
            padding: "0 var(--space-1, 4px)",
          }}
        >
          Evidence direction
        </legend>
        <label
          data-testid="evidence-direction-supports"
          style={{ display: "flex", alignItems: "center", gap: "var(--space-1, 4px)" }}
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
          style={{ display: "flex", alignItems: "center", gap: "var(--space-1, 4px)" }}
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
          gap: "var(--space-1, 4px)",
        }}
      >
        <button
          type="button"
          data-testid="interpretation-editor-cancel"
          onClick={on_close}
          style={{
            background: "transparent",
            border: "var(--border-thin) solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md, 6px)",
            cursor: "pointer",
            fontSize: "var(--font-size-xs, 11px)",
            padding: "4px 10px",
            color: "var(--color-text-secondary, #6b7280)",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          data-testid="interpretation-editor-save"
          onClick={on_save}
          disabled={!can_save}
          style={{
            background: can_save
              ? "var(--color-background-accent, #dbeafe)"
              : "var(--color-background-secondary, #f3f4f6)",
            color: can_save
              ? "var(--color-text-accent, #1d4ed8)"
              : "var(--color-text-tertiary, #9ca3af)",
            border: "none",
            borderRadius: "var(--border-radius-md, 6px)",
            cursor: can_save ? "pointer" : "default",
            fontSize: "var(--font-size-xs, 11px)",
            padding: "4px 10px",
          }}
        >
          Save
        </button>
      </footer>
    </div>
  );
}
