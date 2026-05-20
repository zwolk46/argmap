import * as React from "react";
import type { Premise, Edge } from "@/schema";
import { useSessionStore, useRepository } from "@/state";
import { Pill } from "../../primitives";
import { Button } from "#components/ui/button";
import { Textarea } from "#components/ui/textarea";
import { Crosshair, PencilSimple, Trash } from "@phosphor-icons/react";

export interface PremiseRowProps {
  premise_id: string;
  initial_inline_edit?: boolean;
  on_highlight_on_canvas?: (node_ids: ReadonlyArray<string>) => void;
}

export interface AttachedEdgeCounts {
  answers: number;
  supports: number;
  contradicts: number;
  total: number;
}

// Stable fallback so the Zustand selector below never returns a fresh array.
// (See use-field-attribution.ts for the loop diagnosis.)
const EMPTY_EDGES: ReadonlyArray<Edge> = [];

export function countAttachedEdges(
  premise_id: string,
  argument_edges: ReadonlyArray<Edge>,
): AttachedEdgeCounts {
  let answers = 0;
  let supports = 0;
  let contradicts = 0;
  for (const e of argument_edges) {
    if (e.source !== premise_id) continue;
    if (e.type === "ANSWERS") answers += 1;
    else if (e.type === "SUPPORTS") supports += 1;
    else if (e.type === "CONTRADICTS") contradicts += 1;
  }
  return { answers, supports, contradicts, total: answers + supports + contradicts };
}

export function PremiseRow(props: PremiseRowProps): React.ReactElement | null {
  const { premise_id, initial_inline_edit = false, on_highlight_on_canvas } = props;
  const { session_store } = useRepository();
  const premise = useSessionStore(
    (s) => (s.session?.premises ?? []).find((p: Premise) => p.id === premise_id) ?? null,
  );
  const argument_edges = useSessionStore((s) => s.session?.argument_edges ?? EMPTY_EDGES);
  const [editing, setEditing] = React.useState(initial_inline_edit);
  const [draft_statement, setDraftStatement] = React.useState(premise?.statement ?? "");
  const [confirming_delete, setConfirmingDelete] = React.useState(false);

  React.useEffect(() => {
    if (premise && !editing) setDraftStatement(premise.statement);
  }, [premise, editing]);

  if (!premise) return null;

  const counts = countAttachedEdges(premise.id, argument_edges);

  function on_save_edit(): void {
    const next: Partial<Premise> = { statement: draft_statement };
    session_store
      .getState()
      .applyPatch({ kind: "premise_edited", premise_id: premise!.id, partial: next });
    setEditing(false);
  }

  function on_delete_confirmed(): void {
    const store = session_store.getState();
    for (const e of argument_edges) {
      if (e.source === premise!.id) {
        store.applyPatch({ kind: "argument_edge_removed", edge_id: e.id });
      }
    }
    store.applyPatch({ kind: "premise_removed", premise_id: premise!.id });
    setConfirmingDelete(false);
  }

  return (
    <div data-testid={`premise-row-${premise.id}`} className="flex flex-col gap-1 border-b p-2">
      {editing ? (
        <>
          <Textarea
            data-testid={`premise-edit-statement-${premise.id}`}
            value={draft_statement}
            onChange={(e) => setDraftStatement(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                on_save_edit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
              }
            }}
            className="text-xs"
            style={{ minHeight: 48 }}
          />
          <div className="flex gap-1">
            <Button
              type="button"
              variant="default"
              size="sm"
              data-testid={`premise-edit-save-${premise.id}`}
              onClick={on_save_edit}
            >
              Save
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          <span className="line-clamp-2 text-xs text-foreground">
            {premise.statement || <em>(empty)</em>}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
            <span data-testid={`premise-kind-${premise.id}`}>{premise.kind}</span>
            <span>·</span>
            <span data-testid={`premise-edges-${premise.id}`}>
              {counts.total === 0
                ? "no attachments"
                : [
                    counts.answers > 0 ? `answers ${counts.answers}` : null,
                    counts.supports > 0 ? `supports ${counts.supports}` : null,
                    counts.contradicts > 0 ? `contradicts ${counts.contradicts}` : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
            </span>
            {counts.total === 0 ? (
              <Pill
                variant="severity_warning"
                size="xs"
                data-testid={`premise-orphan-pill-${premise.id}`}
                title="This premise isn't attached to any frame node yet."
              >
                orphan
              </Pill>
            ) : null}
            <span className="ml-auto flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Highlight on canvas"
                data-testid={`premise-highlight-${premise.id}`}
                onClick={() => {
                  const targets = argument_edges
                    .filter((e) => e.source === premise.id)
                    .map((e) => e.target);
                  on_highlight_on_canvas?.(targets);
                }}
                title="Highlight on canvas"
              >
                <Crosshair size={14} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Edit"
                data-testid={`premise-edit-${premise.id}`}
                onClick={() => setEditing(true)}
                title="Edit"
              >
                <PencilSimple size={14} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Delete"
                data-testid={`premise-delete-${premise.id}`}
                onClick={() =>
                  counts.total > 0 ? setConfirmingDelete(true) : on_delete_confirmed()
                }
                title="Delete"
              >
                <Trash size={14} />
              </Button>
            </span>
          </div>
          {confirming_delete ? (
            <div
              data-testid={`premise-delete-confirm-${premise.id}`}
              className="flex flex-col gap-1 rounded-md p-2 text-xs"
              style={{ background: "var(--color-background-warning)" }}
            >
              <span>
                {counts.total} argument edge(s) reference this premise. Deleting the premise will
                also delete those edges. Continue?
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  data-testid={`premise-delete-confirm-yes-${premise.id}`}
                  onClick={on_delete_confirmed}
                >
                  Delete
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
