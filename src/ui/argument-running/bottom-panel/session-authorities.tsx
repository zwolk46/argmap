import * as React from "react";
import type { Authority } from "@/schema";
import { useSessionStore, useRepository } from "@/state";
import { SessionAuthorityRow } from "./session-authority-row";

export interface SessionAuthoritiesProps {
  operating_mode: "legal" | "general";
  on_highlight_on_canvas?: (node_ids: ReadonlyArray<string>) => void;
}

export function SessionAuthorities(props: SessionAuthoritiesProps): React.ReactElement {
  const { session_store, now, generateId } = useRepository();
  const authorities = useSessionStore((s) => s.session?.session_authorities ?? []);

  const [newly_added_id, setNewlyAddedId] = React.useState<string | null>(null);

  const sorted: Authority[] = [...authorities].sort((a, b) => a.id.localeCompare(b.id));

  function on_add(): void {
    const id = generateId();
    const ts = now();
    const authority: Authority = {
      id,
      type: "Authority",
      layer: "argument",
      citation: "",
      created_at: ts,
      updated_at: ts,
    };
    session_store.getState().applyPatch({ kind: "session_authority_added", authority });
    setNewlyAddedId(id);
  }

  return (
    <div
      data-testid="session-authorities"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-2, 8px)",
          borderBottom: "var(--border-thin) solid var(--color-border-tertiary)",
        }}
      >
        <span
          style={{
            fontSize: "var(--font-size-xs, 11px)",
            color: "var(--color-text-secondary, #6b7280)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Session authorities ({sorted.length})
        </span>
        <button
          type="button"
          data-testid="session-authority-add"
          onClick={on_add}
          style={{
            background: "var(--color-background-accent, #dbeafe)",
            color: "var(--color-text-accent, #1d4ed8)",
            border: "none",
            borderRadius: "var(--border-radius-md, 6px)",
            cursor: "pointer",
            fontSize: "var(--font-size-xs, 11px)",
            padding: "2px 8px",
          }}
        >
          + Add Authority
        </button>
      </header>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {sorted.length === 0 ? (
          <div
            data-testid="session-authorities-empty"
            style={{
              padding: "var(--space-3, 12px)",
              fontSize: "var(--font-size-xs, 11px)",
              color: "var(--color-text-tertiary, #9ca3af)",
            }}
          >
            No session-scoped authorities yet. Use this list for case-specific citations you
            don&apos;t want to add to the Frame Authority library.
          </div>
        ) : (
          sorted.map((a) => (
            <SessionAuthorityRow
              key={a.id}
              authority_id={a.id}
              operating_mode={props.operating_mode}
              initial_inline_edit={a.id === newly_added_id}
              on_highlight_on_canvas={props.on_highlight_on_canvas}
            />
          ))
        )}
      </div>
    </div>
  );
}
