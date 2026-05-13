import * as React from "react";
import type { Premise, Edge } from "@/schema";
import { useSessionStore, useRepository } from "@/state";

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
  const argument_edges = useSessionStore((s) => s.session?.argument_edges ?? []);
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
    <div
      data-testid={`premise-row-${premise.id}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1, 4px)",
        padding: "var(--space-2, 8px)",
        borderBottom: "var(--border-thin) solid var(--color-border-tertiary)",
      }}
    >
      {editing ? (
        <>
          <textarea
            data-testid={`premise-edit-statement-${premise.id}`}
            value={draft_statement}
            onChange={(e) => setDraftStatement(e.target.value)}
            style={{
              minHeight: 48,
              padding: "4px 6px",
              border: "var(--border-thin) solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md, 6px)",
              fontSize: "var(--font-size-xs, 11px)",
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: "var(--space-1, 4px)" }}>
            <button
              type="button"
              data-testid={`premise-edit-save-${premise.id}`}
              onClick={on_save_edit}
              style={primary_btn()}
            >
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} style={secondary_btn()}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <span
            style={{
              fontSize: "var(--font-size-xs, 11px)",
              color: "var(--color-text-primary, #111827)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {premise.statement || <em>(empty)</em>}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1, 4px)",
              fontSize: "10px",
              color: "var(--color-text-tertiary, #9ca3af)",
            }}
          >
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
              <span
                data-testid={`premise-orphan-pill-${premise.id}`}
                style={{
                  padding: "0 4px",
                  borderRadius: "999px",
                  background: "var(--color-background-warning, #fef3c7)",
                  color: "var(--color-text-warning, #92400e)",
                }}
              >
                orphan
              </span>
            ) : null}
            <span style={{ marginLeft: "auto", display: "flex", gap: "var(--space-1, 4px)" }}>
              <button
                type="button"
                data-testid={`premise-highlight-${premise.id}`}
                onClick={() => {
                  const targets = argument_edges
                    .filter((e) => e.source === premise.id)
                    .map((e) => e.target);
                  on_highlight_on_canvas?.(targets);
                }}
                style={icon_btn()}
                title="Highlight on canvas"
              >
                ⌖
              </button>
              <button
                type="button"
                data-testid={`premise-edit-${premise.id}`}
                onClick={() => setEditing(true)}
                style={icon_btn()}
                title="Edit"
              >
                ✎
              </button>
              <button
                type="button"
                data-testid={`premise-delete-${premise.id}`}
                onClick={() =>
                  counts.total > 0 ? setConfirmingDelete(true) : on_delete_confirmed()
                }
                style={icon_btn()}
                title="Delete"
              >
                ⌫
              </button>
            </span>
          </div>
          {confirming_delete ? (
            <div
              data-testid={`premise-delete-confirm-${premise.id}`}
              style={{
                background: "var(--color-background-warning, #fef3c7)",
                padding: "var(--space-2, 8px)",
                borderRadius: "var(--border-radius-md, 6px)",
                fontSize: "var(--font-size-xs, 11px)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1, 4px)",
              }}
            >
              <span>
                {counts.total} argument edge(s) reference this premise. Deleting the premise will
                also delete those edges. Continue?
              </span>
              <div style={{ display: "flex", gap: "var(--space-1, 4px)" }}>
                <button
                  type="button"
                  data-testid={`premise-delete-confirm-yes-${premise.id}`}
                  onClick={on_delete_confirmed}
                  style={primary_btn()}
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  style={secondary_btn()}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function icon_btn(): React.CSSProperties {
  return {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "var(--color-text-tertiary, #9ca3af)",
    fontSize: "12px",
    padding: "0 4px",
  };
}

function primary_btn(): React.CSSProperties {
  return {
    background: "var(--color-background-accent, #dbeafe)",
    color: "var(--color-text-accent, #1d4ed8)",
    border: "none",
    borderRadius: "var(--border-radius-md, 6px)",
    cursor: "pointer",
    fontSize: "var(--font-size-xs, 11px)",
    padding: "2px 8px",
  };
}

function secondary_btn(): React.CSSProperties {
  return {
    background: "transparent",
    border: "var(--border-thin) solid var(--color-border-tertiary)",
    borderRadius: "var(--border-radius-md, 6px)",
    cursor: "pointer",
    fontSize: "var(--font-size-xs, 11px)",
    padding: "2px 8px",
    color: "var(--color-text-secondary, #6b7280)",
  };
}
