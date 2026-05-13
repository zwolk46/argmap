import * as React from "react";
import type { ReactElement } from "react";
import { useFrameStore, useRepository } from "@/state";

export interface FrameTitleProps {
  read_only?: boolean;
}

export function FrameTitle({ read_only }: FrameTitleProps): ReactElement {
  const title = useFrameStore((s) => s.frame?.title ?? "");
  const { frame_store } = useRepository();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  function startEdit() {
    if (read_only) return;
    setDraft(title);
    setEditing(true);
  }

  function commit() {
    if (draft.trim()) {
      frame_store
        .getState()
        .applyPatch({ kind: "metadata_edited", partial: { title: draft.trim() } });
    }
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
  }

  React.useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        data-testid="frame-title-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        onBlur={commit}
        style={{
          fontSize: "var(--font-size-lg)",
          fontWeight: "var(--font-weight-semibold)",
          fontFamily: "var(--font-sans)",
          color: "var(--color-text-primary)",
          background: "transparent",
          border: "none",
          borderBottom: "var(--border-medium) solid var(--color-mode-current-accent)",
          outline: "none",
          padding: "0",
          width: "100%",
        }}
      />
    );
  }

  return (
    <span
      data-testid="frame-title"
      onClick={startEdit}
      title={read_only ? undefined : "Click to rename"}
      style={{
        fontSize: "var(--font-size-lg)",
        fontWeight: "var(--font-weight-semibold)",
        fontFamily: "var(--font-sans)",
        color: "var(--color-text-primary)",
        cursor: read_only ? "default" : "text",
        letterSpacing: "var(--letter-spacing-tight)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        padding: read_only ? "0" : "2px 6px",
        margin: read_only ? "0" : "0 -6px",
        borderRadius: "var(--radius-sm)",
        transition: "background var(--duration-fast) var(--ease-standard)",
      }}
      onMouseEnter={(e) => {
        if (!read_only) {
          (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {title || "Untitled Frame"}
    </span>
  );
}
