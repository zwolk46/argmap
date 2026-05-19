import * as React from "react";
import type { ReactElement } from "react";
import { useFrameStore, useRepository } from "@/state";
import { useOptionalToast } from "../primitives/toast";

// §9 #8: hard cap on title length to prevent runaway pastes / accidental
// novella-sized titles. 200 chars comfortably covers the longest practical
// case-name / topic phrasing while keeping the field a single visual line.
export const FRAME_TITLE_MAX_LENGTH = 200;

// §9 #8: a multi-line paste (e.g. copy from a heading + subtitle) used to
// land with embedded newlines and tabs, breaking the single-line layout.
// Replace all whitespace runs (incl. \r, \n, \t) with single spaces.
function flattenWhitespace(value: string): string {
  return value.replace(/\s+/g, " ");
}

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
      frame_store.getState().applyPatch({ kind: "metadata_edited", partial: { title: trimmed } });
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
        maxLength={FRAME_TITLE_MAX_LENGTH}
        onChange={(e) => setDraft(flattenWhitespace(e.target.value))}
        onPaste={(e) => {
          // Intercept paste so multi-line clipboard content is flattened
          // before it lands in the input (more graceful than letting it
          // arrive multi-line and getting stripped after the fact).
          const pasted = e.clipboardData.getData("text");
          if (/\s/.test(pasted) && pasted !== flattenWhitespace(pasted)) {
            e.preventDefault();
            const input = e.currentTarget;
            const start = input.selectionStart ?? draft.length;
            const end = input.selectionEnd ?? draft.length;
            const cleaned = flattenWhitespace(pasted);
            const next = (draft.slice(0, start) + cleaned + draft.slice(end)).slice(
              0,
              FRAME_TITLE_MAX_LENGTH,
            );
            setDraft(next);
          }
        }}
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
