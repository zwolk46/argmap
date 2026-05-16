import * as React from "react";
import type { ReactElement } from "react";
import { useFrameStore, useRepository } from "@/state";
import { useOptionalToast } from "../primitives/toast";

export interface FrameTitleProps {
  read_only?: boolean;
}

export function FrameTitle({ read_only }: FrameTitleProps): ReactElement {
  const title = useFrameStore((s) => s.frame?.title ?? "");
  const { frame_store } = useRepository();
  const toast = useOptionalToast();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  function startEdit() {
    if (read_only) return;
    setDraft(title);
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed) {
      frame_store
        .getState()
        .applyPatch({ kind: "metadata_edited", partial: { title: trimmed } });
    } else if (title) {
      // §9 #7: empty commit silently snapped back; the user typed and saw
      // their text vanish with no explanation. Surface an inline toast so
      // they know why the value reverted.
      toast?.push({
        kind: "warning",
        message: "Title can't be blank — reverted to the previous value.",
      });
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

  // P7: rendered as <h1> so the frame title acts as the page's main heading
  // for AT/SEO. The h1 contains a real <button> for the edit affordance so
  // keyboard users can activate it with Enter/Space (the prior onClick-on-h1
  // pattern was mouse-only).
  const display_title = title || "Untitled frame";
  if (read_only) {
    return (
      <h1
        data-testid="frame-title"
        style={{
          fontSize: "var(--font-size-lg)",
          fontWeight: "var(--font-weight-semibold)",
          fontFamily: "var(--font-sans)",
          color: "var(--color-text-primary)",
          letterSpacing: "var(--letter-spacing-tight)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          margin: 0,
          display: "inline-block",
          lineHeight: "var(--line-height-tight)",
        }}
      >
        {display_title}
      </h1>
    );
  }
  return (
    <h1
      style={{
        margin: 0,
        display: "inline-block",
        lineHeight: "var(--line-height-tight)",
      }}
    >
      <button
        type="button"
        data-testid="frame-title"
        onClick={startEdit}
        title="Click to rename"
        aria-label={`Rename frame: ${display_title}`}
        className="argmap-row-hover"
        style={{
          all: "unset",
          cursor: "text",
          fontSize: "var(--font-size-lg)",
          fontWeight: "var(--font-weight-semibold)",
          fontFamily: "var(--font-sans)",
          color: "var(--color-text-primary)",
          letterSpacing: "var(--letter-spacing-tight)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          padding: "2px 6px",
          margin: "0 -6px",
          borderRadius: "var(--radius-sm)",
          transition: "background var(--duration-fast) var(--ease-standard)",
          display: "inline-block",
          lineHeight: "var(--line-height-tight)",
        }}
      >
        {display_title}
      </button>
    </h1>
  );
}
