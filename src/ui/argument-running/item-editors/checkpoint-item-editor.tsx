import * as React from "react";
import type { Checkpoint, CheckpointOption } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Button } from "../../primitives";
import { PremiseAuthoringSection, type PremiseAuthoringResult } from "./premise-authoring-section";
import { AuthorityAttachmentSection } from "./authority-attachment-section";
import { NotesField } from "./notes-field";

export interface CheckpointItemEditorProps {
  node: Checkpoint;
  on_close: () => void;
  on_saved: () => void;
}

export function CheckpointItemEditor(props: CheckpointItemEditorProps): React.ReactElement {
  const { node, on_close, on_saved } = props;
  const { session_store } = useRepository();
  const frame_mode = useFrameStore((s) => s.frame?.mode);
  const is_legal = frame_mode === "legal";

  const [selected_option_id, setSelectedOptionId] = React.useState<string | null>(null);
  const [premise_result, setPremiseResult] = React.useState<PremiseAuthoringResult | null>(null);
  const [authority_id, setAuthorityId] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  // Legal-mode Checkpoints flagged requires_authority must have an
  // authority attached before save — otherwise the runtime quietly
  // resolves the answer to `indeterminate` with no editor-level reason.
  const authority_required = is_legal && node.requires_authority === true;
  const authority_satisfied = !authority_required || authority_id !== null;
  const can_save =
    selected_option_id !== null && premise_result !== null && authority_satisfied;

  function on_save(): void {
    if (!can_save) {
      if (authority_required && !authority_id) {
        setError("This Checkpoint requires an Authority. Attach one before saving.");
      }
      return;
    }
    setError(null);
    try {
      const store = session_store.getState();
      let premise_id: string;
      const trimmed_notes = notes.trim() ? notes : undefined;
      if (premise_result!.kind === "new") {
        // P0-16: stash the Authority selection on the new Premise via
        // authority_ref so it persists. The Premise schema supports
        // authority_ref out of the box; before this fix the editor's
        // `authority_id` was silently discarded.
        // Also include `notes` on the new Premise so reuse and the Pool
        // surfaces don't lose the user-typed context when the same
        // Premise is referenced from a later editor.
        const enriched = {
          ...premise_result!.premise,
          ...(authority_id ? { authority_ref: authority_id } : {}),
          ...(trimmed_notes ? { notes: trimmed_notes } : {}),
        };
        store.applyPatch({ kind: "premise_added", premise: enriched });
        premise_id = enriched.id;
      } else {
        premise_id = premise_result!.premise_id;
      }
      store.applyPatch({
        kind: "checkpoint_answered",
        node_id: node.id,
        answer: {
          selected_option_id: selected_option_id!,
          premise_id,
          notes: trimmed_notes,
        },
      });
      on_saved();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div
      data-testid="checkpoint-item-editor"
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
          {node.question}
        </h3>
        <span className="argmap-section-heading">Checkpoint · {node.answer_type}</span>
      </header>

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
          Answer
        </legend>
        {node.options.map((opt: CheckpointOption) => (
          <label
            key={opt.id}
            data-testid={`checkpoint-answer-${opt.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
              fontSize: "var(--font-size-xs)",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name={`checkpoint-${node.id}`}
              value={opt.id}
              checked={selected_option_id === opt.id}
              onChange={() => setSelectedOptionId(opt.id)}
            />
            {opt.label}
          </label>
        ))}
      </fieldset>

      <PremiseAuthoringSection
        value={premise_result}
        on_change={setPremiseResult}
        default_kind={is_legal ? "found" : "empirical"}
        reuse_context={node.question}
        enable_g11={is_legal}
      />

      {is_legal && node.requires_authority ? (
        <AuthorityAttachmentSection value={authority_id} on_change={setAuthorityId} />
      ) : null}

      <NotesField value={notes} on_change={setNotes} />

      {error ? (
        <div
          data-testid="checkpoint-editor-error"
          style={{
            padding: "var(--space-2)",
            background: "var(--color-background-danger)",
            color: "var(--color-text-danger)",
            borderRadius: "var(--border-radius-md)",
            fontSize: "var(--font-size-xs)",
          }}
        >
          {error}
        </div>
      ) : null}

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
          data-testid="checkpoint-editor-cancel"
          onClick={on_close}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          data-testid="checkpoint-editor-save"
          onClick={on_save}
          disabled={!can_save}
        >
          Save
        </Button>
      </footer>
    </div>
  );
}
