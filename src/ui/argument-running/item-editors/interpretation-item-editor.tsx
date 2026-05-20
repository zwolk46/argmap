import * as React from "react";
import type { NodeRef, Interpretation, Edge } from "@/schema";
import { useRepository } from "@/state";
import { Button } from "#components/ui/button";
import { Label } from "#components/ui/label";
import { RadioGroup, RadioGroupItem } from "#components/ui/radio-group";
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
      className="flex flex-col gap-3 p-3"
    >
      <header className="flex flex-col gap-1">
        <h3 className="m-0 text-base text-foreground">{node.statement}</h3>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Interpretation
        </span>
      </header>

      <fieldset className="flex gap-2 rounded-md border p-2">
        <legend className="px-1 text-xs text-muted-foreground">Evidence direction</legend>
        <RadioGroup
          value={direction}
          onValueChange={(v) => setDirection(v as "SUPPORTS" | "CONTRADICTS")}
          className="flex flex-row gap-2"
        >
          <Label
            data-testid="evidence-direction-supports"
            htmlFor={`direction-${node.id}-supports`}
            className="flex cursor-pointer items-center gap-1 text-xs font-normal"
          >
            <RadioGroupItem id={`direction-${node.id}-supports`} value="SUPPORTS" />
            Supports
          </Label>
          <Label
            data-testid="evidence-direction-contradicts"
            htmlFor={`direction-${node.id}-contradicts`}
            className="flex cursor-pointer items-center gap-1 text-xs font-normal"
          >
            <RadioGroupItem id={`direction-${node.id}-contradicts`} value="CONTRADICTS" />
            Contradicts
          </Label>
        </RadioGroup>
      </fieldset>

      <PremiseAuthoringSection
        value={premise_result}
        on_change={setPremiseResult}
        default_kind="found"
        reuse_context={node.statement}
      />
      <AuthorityAttachmentSection value={authority_id} on_change={setAuthorityId} />
      <NotesField value={notes} on_change={setNotes} />

      <footer className="flex justify-end gap-1">
        <Button
          type="button"
          variant="outline"
          data-testid="interpretation-editor-cancel"
          onClick={on_close}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="default"
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
