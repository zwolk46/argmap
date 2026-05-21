import * as React from "react";
import type { Checkpoint, CheckpointOption } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Button } from "#components/ui/button";
import { Label } from "#components/ui/label";
import { RadioGroup, RadioGroupItem } from "#components/ui/radio-group";
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
  const can_save = selected_option_id !== null && premise_result !== null && authority_satisfied;

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
      className="flex flex-col gap-3 p-3"
    >
      <header className="flex flex-col gap-1">
        <h3 className="m-0 text-base text-foreground">{node.question}</h3>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Checkpoint · {node.answer_type}
        </span>
      </header>

      <fieldset className="flex flex-col gap-1 rounded-md border p-2">
        <legend className="px-1 text-xs text-muted-foreground">Answer</legend>
        <RadioGroup
          value={selected_option_id ?? ""}
          onValueChange={(v) => setSelectedOptionId(v)}
          className="gap-1"
        >
          {node.options.map((opt: CheckpointOption) => {
            const radio_id = `checkpoint-${node.id}-${opt.id}`;
            return (
              <Label
                key={opt.id}
                htmlFor={radio_id}
                data-testid={`checkpoint-answer-${opt.id}`}
                className="flex cursor-pointer items-center gap-1 text-xs font-normal"
              >
                <RadioGroupItem id={radio_id} value={opt.id} />
                {opt.label}
              </Label>
            );
          })}
        </RadioGroup>
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
          className="rounded-md p-2 text-xs"
          style={{
            background: "var(--color-background-danger)",
            color: "var(--color-text-danger)",
          }}
        >
          {error}
        </div>
      ) : null}

      <footer className="flex justify-end gap-1">
        <Button
          type="button"
          variant="outline"
          data-testid="checkpoint-editor-cancel"
          onClick={on_close}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="default"
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
