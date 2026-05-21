import * as React from "react";
import type { Authority, Edge } from "@/schema";
import { useSessionStore, useRepository } from "@/state";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Crosshair, PencilSimple, Trash } from "@phosphor-icons/react";

export interface SessionAuthorityRowProps {
  authority_id: string;
  operating_mode: "legal" | "general";
  initial_inline_edit?: boolean;
  on_highlight_on_canvas?: (node_ids: ReadonlyArray<string>) => void;
}

// Stable fallback so the Zustand selector below never returns a fresh array.
// (See use-field-attribution.ts for the loop diagnosis.)
const EMPTY_EDGES: ReadonlyArray<Edge> = [];

export function SessionAuthorityRow(props: SessionAuthorityRowProps): React.ReactElement | null {
  const {
    authority_id,
    operating_mode,
    initial_inline_edit = false,
    on_highlight_on_canvas,
  } = props;
  const { session_store } = useRepository();
  const authority = useSessionStore(
    (s) =>
      (s.session?.session_authorities ?? []).find((a: Authority) => a.id === authority_id) ?? null,
  );
  const argument_edges = useSessionStore((s) => s.session?.argument_edges ?? EMPTY_EDGES);

  const [editing, setEditing] = React.useState(initial_inline_edit);
  const [name, setName] = React.useState(authority?.citation ?? "");
  const [confirming_delete, setConfirmingDelete] = React.useState(false);

  React.useEffect(() => {
    if (authority && !editing) setName(authority.citation);
  }, [authority, editing]);

  if (!authority) return null;

  const citations_to_this = argument_edges.filter(
    (e) => e.type === "CITES" && e.target === authority.id,
  );

  function on_save_edit(): void {
    session_store.getState().applyPatch({
      kind: "session_authority_edited",
      authority_id: authority!.id,
      partial: { citation: name },
    });
    setEditing(false);
  }

  function on_delete_confirmed(): void {
    const store = session_store.getState();
    for (const e of citations_to_this) {
      store.applyPatch({ kind: "argument_edge_removed", edge_id: e.id });
    }
    store.applyPatch({ kind: "session_authority_removed", authority_id: authority!.id });
    setConfirmingDelete(false);
  }

  return (
    <div
      data-testid={`session-authority-row-${authority.id}`}
      className="flex flex-col gap-1 border-b p-2"
    >
      {editing ? (
        <>
          <Input
            data-testid={`session-authority-name-${authority.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                on_save_edit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
              }
            }}
            className="text-xs"
          />
          <div className="flex gap-1">
            <Button
              type="button"
              variant="default"
              size="sm"
              data-testid={`session-authority-save-${authority.id}`}
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
          <span className="text-xs text-foreground">
            {authority.citation || <em>(unnamed)</em>}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
            {operating_mode === "legal" && authority.jurisdiction ? (
              <span data-testid={`session-authority-jurisdiction-${authority.id}`}>
                {(authority.jurisdiction as { value?: string }).value ??
                  String(authority.jurisdiction)}
              </span>
            ) : null}
            {operating_mode === "legal" ? (
              <span data-testid={`session-authority-binding-${authority.id}`}>
                {authority.is_binding === true
                  ? "binding"
                  : authority.is_binding === false
                    ? "persuasive"
                    : "(not set)"}
              </span>
            ) : null}
            <span data-testid={`session-authority-citations-${authority.id}`}>
              {citations_to_this.length === 0
                ? "no citations yet"
                : `cited by ${citations_to_this.length}`}
            </span>
            <span className="ml-auto flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Highlight on canvas"
                data-testid={`session-authority-highlight-${authority.id}`}
                onClick={() => {
                  const sources = citations_to_this.map((e) => e.source);
                  on_highlight_on_canvas?.(sources);
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
                data-testid={`session-authority-edit-${authority.id}`}
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
                data-testid={`session-authority-delete-${authority.id}`}
                onClick={() =>
                  citations_to_this.length > 0 ? setConfirmingDelete(true) : on_delete_confirmed()
                }
                title="Delete"
              >
                <Trash size={14} />
              </Button>
            </span>
          </div>
          {confirming_delete ? (
            <div
              data-testid={`session-authority-delete-confirm-${authority.id}`}
              className="flex flex-col gap-1 rounded-md p-2 text-xs"
              style={{ background: "var(--color-background-warning)" }}
            >
              <span>
                {citations_to_this.length} CITES edge(s) reference this authority. Deleting will
                also delete those edges. Continue?
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={on_delete_confirmed}
                  data-testid={`session-authority-delete-confirm-yes-${authority.id}`}
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
