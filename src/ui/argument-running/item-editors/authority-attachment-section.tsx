import * as React from "react";
import type { NodeRef, Authority, Node } from "@/schema";
import { useFrameStore, useSessionStore, useRepository } from "@/state";
import { Button } from "../../primitives";

// Stable empty-array fallbacks. Zustand selectors must return a reference
// that is `Object.is`-stable across renders when the underlying value hasn't
// changed; returning a fresh `[]` from a `?? []` fallback (or computing a
// fresh array via `.filter(...)` inside the selector) trips React's
// "Maximum update depth exceeded" loop via useSyncExternalStore.
const EMPTY_NODES: ReadonlyArray<Node> = [];
const EMPTY_AUTHORITIES: ReadonlyArray<Authority> = [];

export interface AuthorityAttachmentSectionProps {
  value: NodeRef | null;
  on_change: (next: NodeRef | null) => void;
  mode_override?: "legal" | "general";
  flavor_override?: "personal" | "academic";
  frame_authority_opted_in?: boolean;
}

export function authorityPickerVisible(
  mode: "legal" | "general",
  flavor: "personal" | "academic" | undefined,
  frame_authority_opted_in?: boolean,
): boolean {
  if (mode === "legal") return true;
  if (flavor === "academic") return true;
  if (flavor === "personal" && !frame_authority_opted_in) return false;
  return true;
}

export interface NewSessionAuthorityResult {
  kind: "new";
  authority: Authority;
}

export function AuthorityAttachmentSection(
  props: AuthorityAttachmentSectionProps,
): React.ReactElement | null {
  const { value, on_change, mode_override, flavor_override, frame_authority_opted_in } = props;
  const frame_mode = useFrameStore((s) => s.frame?.mode);
  const frame_flavor = useFrameStore((s) => s.frame?.flavor);
  const mode: "legal" | "general" = mode_override ?? (frame_mode === "legal" ? "legal" : "general");
  const flavor = flavor_override ?? (frame_flavor === "academic" ? "academic" : undefined);

  const visible = authorityPickerVisible(mode, flavor, frame_authority_opted_in);
  // Read the nodes array (or the stable empty fallback) from the store, then
  // derive `frame_authorities` in a memoized step. Filtering inside the
  // selector would return a new array each call and loop us.
  const all_frame_nodes = useFrameStore((s) => s.frame_version?.nodes ?? EMPTY_NODES);
  const frame_authorities = React.useMemo(
    () => all_frame_nodes.filter((n): n is Authority => n.type === "Authority"),
    [all_frame_nodes],
  );
  const session_authorities = useSessionStore(
    (s) => s.session?.session_authorities ?? EMPTY_AUTHORITIES,
  ) as ReadonlyArray<Authority>;

  const { session_store, now, generateId } = useRepository();
  const [creating_new, setCreatingNew] = React.useState(false);
  const [new_name, setNewName] = React.useState("");
  const [new_citation, setNewCitation] = React.useState("");

  if (!visible) return null;

  const label = mode === "legal" ? "Authority" : flavor === "academic" ? "Source" : "Authority";

  function commit_new(): void {
    if (new_name.trim().length === 0) return;
    const ts = now();
    const authority: Authority = {
      id: generateId(),
      type: "Authority",
      layer: "argument",
      citation: new_citation || new_name,
      created_at: ts,
      updated_at: ts,
    };
    session_store.getState().applyPatch({ kind: "session_authority_added", authority });
    on_change(authority.id);
    setCreatingNew(false);
    setNewName("");
    setNewCitation("");
  }

  const sorted_frame = [...frame_authorities].sort((a, b) => a.id.localeCompare(b.id));
  const sorted_session = [...session_authorities].sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div
      data-testid="authority-attachment-section"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2, 8px)",
      }}
    >
      <label
        style={{
          fontSize: "var(--font-size-xs, 11px)",
          color: "var(--color-text-secondary, #6b7280)",
        }}
      >
        {label}
        <select
          data-testid="authority-picker"
          value={value ?? ""}
          onChange={(e) => on_change(e.target.value || null)}
          className="argmap-input"
          style={{
            fontSize: "var(--font-size-xs, 11px)",
          }}
        >
          <option value="">(none)</option>
          {sorted_frame.length > 0 ? (
            <optgroup label="Frame authorities">
              {sorted_frame.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.citation}
                </option>
              ))}
            </optgroup>
          ) : null}
          {sorted_session.length > 0 ? (
            <optgroup label="Session authorities">
              {sorted_session.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.citation}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </label>
      {creating_new ? (
        <div
          data-testid="authority-new-form"
          style={{
            padding: "var(--space-2, 8px)",
            background: "var(--color-surface-pane-secondary, #fafafa)",
            borderRadius: "var(--border-radius-md, 6px)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-1, 4px)",
          }}
        >
          <input
            data-testid="authority-new-name"
            value={new_name}
            placeholder="Name"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit_new();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setCreatingNew(false);
              }
            }}
            className="argmap-input"
            style={{ fontSize: "var(--font-size-xs, 11px)" }}
          />
          <input
            data-testid="authority-new-citation"
            value={new_citation}
            placeholder="Citation"
            onChange={(e) => setNewCitation(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit_new();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setCreatingNew(false);
              }
            }}
            className="argmap-input"
            style={{ fontSize: "var(--font-size-xs, 11px)" }}
          />
          <div style={{ display: "flex", gap: "var(--space-1, 4px)" }}>
            <Button
              variant="primary"
              size="md"
              data-testid="authority-new-save"
              onClick={commit_new}
            >
              Save
            </Button>
            <Button variant="secondary" size="md" onClick={() => setCreatingNew(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          data-testid="authority-new-toggle"
          onClick={() => setCreatingNew(true)}
          style={{ alignSelf: "flex-start" }}
        >
          + New session {label.toLowerCase()}
        </Button>
      )}
    </div>
  );
}
