import * as React from "react";
import type { Authority } from "@/schema";
import { useSessionStore, useRepository } from "@/state";

export interface SessionAuthorityRowProps {
  authority_id: string;
  operating_mode: "legal" | "general";
  initial_inline_edit?: boolean;
  on_highlight_on_canvas?: (node_ids: ReadonlyArray<string>) => void;
}

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
  const argument_edges = useSessionStore((s) => s.session?.argument_edges ?? []);

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
          <input
            data-testid={`session-authority-name-${authority.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              padding: "4px 6px",
              border: "var(--border-thin) solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md, 6px)",
              fontSize: "var(--font-size-xs, 11px)",
            }}
          />
          <div style={{ display: "flex", gap: "var(--space-1, 4px)" }}>
            <button
              type="button"
              data-testid={`session-authority-save-${authority.id}`}
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
            }}
          >
            {authority.citation || <em>(unnamed)</em>}
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
            <span style={{ marginLeft: "auto", display: "flex", gap: "var(--space-1, 4px)" }}>
              <button
                type="button"
                data-testid={`session-authority-highlight-${authority.id}`}
                onClick={() => {
                  const sources = citations_to_this.map((e) => e.source);
                  on_highlight_on_canvas?.(sources);
                }}
                style={icon_btn()}
                title="Highlight on canvas"
              >
                ⌖
              </button>
              <button
                type="button"
                data-testid={`session-authority-edit-${authority.id}`}
                onClick={() => setEditing(true)}
                style={icon_btn()}
                title="Edit"
              >
                ✎
              </button>
              <button
                type="button"
                data-testid={`session-authority-delete-${authority.id}`}
                onClick={() =>
                  citations_to_this.length > 0 ? setConfirmingDelete(true) : on_delete_confirmed()
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
              data-testid={`session-authority-delete-confirm-${authority.id}`}
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
                {citations_to_this.length} CITES edge(s) reference this authority. Deleting will
                also delete those edges. Continue?
              </span>
              <div style={{ display: "flex", gap: "var(--space-1, 4px)" }}>
                <button
                  type="button"
                  onClick={on_delete_confirmed}
                  style={primary_btn()}
                  data-testid={`session-authority-delete-confirm-yes-${authority.id}`}
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
