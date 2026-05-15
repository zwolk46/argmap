import * as React from "react";
import type { NodeRef, Term, Interpretation, Node, Edge } from "@/schema";
import { useSessionStore, useRepository, useFrameStore } from "@/state";
import { Button } from "../../primitives";
import { PremiseAuthoringSection, type PremiseAuthoringResult } from "./premise-authoring-section";
import { AuthorityAttachmentSection } from "./authority-attachment-section";
import { NotesField } from "./notes-field";

export interface TermItemEditorProps {
  node: Term;
  on_close: () => void;
  on_saved: () => void;
}

export function listTermInterpretations(
  term: Term,
  nodes_by_id: ReadonlyMap<NodeRef, Node>,
  edges: ReadonlyArray<Edge>,
): ReadonlyArray<Interpretation> {
  const interpretation_ids = edges
    .filter((e) => e.type === "INTERPRETED_AS" && e.source === term.id)
    .map((e) => e.target);
  const interpretations: Interpretation[] = [];
  for (const id of interpretation_ids) {
    const n = nodes_by_id.get(id);
    if (n && n.type === "Interpretation") interpretations.push(n);
  }
  return [...interpretations].sort((a, b) => a.id.localeCompare(b.id));
}

export function TermItemEditor(props: TermItemEditorProps): React.ReactElement {
  const { node, on_close, on_saved } = props;
  const { session_store } = useRepository();
  const frame_version = useFrameStore((s) => s.frame_version);
  const session = useSessionStore((s) => s.session);

  const [selected_interpretation_id, setSelectedInterpretationId] = React.useState<NodeRef | null>(
    null,
  );
  const [premise_result, setPremiseResult] = React.useState<PremiseAuthoringResult | null>(null);
  const [authority_id, setAuthorityId] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState("");

  const interpretations = React.useMemo(() => {
    const fv = session?.frame_version_snapshot ?? frame_version;
    if (!fv) return [] as ReadonlyArray<Interpretation>;
    const nodes_by_id = new Map<NodeRef, Node>(fv.nodes.map((n) => [n.id, n]));
    return listTermInterpretations(node, nodes_by_id, fv.edges);
  }, [node, session, frame_version]);

  const can_save = selected_interpretation_id !== null;

  function on_save(): void {
    const store = session_store.getState();
    // P0-16: enrich the new Premise with the editor's Notes + Authority so
    // they actually persist. (Reusing an existing Premise keeps that
    // Premise's existing notes/authority_ref unchanged; editing a reused
    // Premise requires the inline edit affordance, not this surface.)
    if (premise_result && premise_result.kind === "new") {
      const enriched = {
        ...premise_result.premise,
        ...(notes.trim().length > 0 ? { notes } : {}),
        ...(authority_id ? { authority_ref: authority_id } : {}),
      };
      store.applyPatch({ kind: "premise_added", premise: enriched });
    }
    store.applyPatch({
      kind: "interpretation_selected",
      term_id: node.id,
      interpretation_id: selected_interpretation_id!,
    });
    on_saved();
  }

  return (
    <div
      data-testid="term-item-editor"
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
          {node.name}
        </h3>
        <span className="argmap-section-heading">Term</span>
      </header>

      {node.linked_to ? (
        <div
          data-testid="term-linked-notice"
          style={{
            padding: "var(--space-2)",
            background: "var(--color-background-warning)",
            color: "var(--color-text-warning)",
            borderRadius: "var(--border-radius-md)",
            fontSize: "var(--font-size-xs)",
          }}
        >
          This term is linked to another. Selecting an interpretation here will not affect the
          linked target.
        </div>
      ) : null}

      <fieldset
        style={{
          border: "var(--border-thin) solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: "var(--space-2)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-1)",
        }}
      >
        <legend
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-secondary)",
            padding: "0 var(--space-1)",
          }}
        >
          Interpretations
        </legend>
        {interpretations.length === 0 ? (
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-tertiary)",
            }}
          >
            No interpretations attached to this term.
          </span>
        ) : (
          interpretations.map((i) => (
            <label
              key={i.id}
              data-testid={`term-interpretation-${i.id}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--space-1)",
                fontSize: "var(--font-size-xs)",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name={`term-${node.id}`}
                checked={selected_interpretation_id === i.id}
                onChange={() => setSelectedInterpretationId(i.id)}
              />
              <span>{i.statement}</span>
            </label>
          ))
        )}
      </fieldset>

      <PremiseAuthoringSection
        value={premise_result}
        on_change={setPremiseResult}
        default_kind="found"
        reuse_context={node.name}
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
        <Button variant="secondary" size="md" data-testid="term-editor-cancel" onClick={on_close}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          data-testid="term-editor-save"
          onClick={on_save}
          disabled={!can_save}
        >
          Save
        </Button>
      </footer>
    </div>
  );
}
