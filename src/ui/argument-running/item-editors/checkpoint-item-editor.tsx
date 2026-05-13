import * as React from "react";
import type { Checkpoint, CheckpointOption } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
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

  const can_save = selected_option_id !== null && premise_result !== null;

  function on_save(): void {
    if (!can_save) return;
    setError(null);
    try {
      const store = session_store.getState();
      let premise_id: string;
      if (premise_result!.kind === "new") {
        store.applyPatch({ kind: "premise_added", premise: premise_result!.premise });
        premise_id = premise_result!.premise.id;
      } else {
        premise_id = premise_result!.premise_id;
      }
      store.applyPatch({
        kind: "checkpoint_answered",
        node_id: node.id,
        answer: {
          selected_option_id: selected_option_id!,
          premise_id,
          notes: notes.trim() ? notes : undefined,
        },
      });
      // authority_id is intentionally not persisted at the SessionPatch level in v1
      // (the schema's Premise carries an optional authority_ref but the patch
      // surface does not expose it). I.9d will close this loop.
      void authority_id;
      on_saved();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div
      data-testid="checkpoint-item-editor"
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
          {node.question}
        </h3>
        <span
          style={{
            fontSize: "10px",
            color: "var(--color-text-tertiary, #9ca3af)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Checkpoint · {node.answer_type}
        </span>
      </header>

      <fieldset
        style={{
          border: "var(--border-thin) solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md, 6px)",
          padding: "var(--space-2, 8px)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-1, 4px)",
        }}
      >
        <legend
          style={{
            fontSize: "var(--font-size-xs, 11px)",
            color: "var(--color-text-secondary, #6b7280)",
            padding: "0 var(--space-1, 4px)",
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
              gap: "var(--space-1, 4px)",
              fontSize: "var(--font-size-xs, 11px)",
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
            padding: "var(--space-2, 8px)",
            background: "var(--color-background-danger, #fee2e2)",
            color: "var(--color-text-danger, #b91c1c)",
            borderRadius: "var(--border-radius-md, 6px)",
            fontSize: "var(--font-size-xs, 11px)",
          }}
        >
          {error}
        </div>
      ) : null}

      <footer
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "var(--space-1, 4px)",
        }}
      >
        <button
          type="button"
          data-testid="checkpoint-editor-cancel"
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
          data-testid="checkpoint-editor-save"
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
