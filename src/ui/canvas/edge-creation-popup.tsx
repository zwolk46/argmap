import * as React from "react";
import type { ReactElement } from "react";
import type { EdgeCreationCandidate } from "./edges/edge-validity";
import { candidateLabel } from "./edges/edge-validity";
import { Z } from "../primitives";

export interface EdgeCreationPopupProps {
  open: boolean;
  position: { x: number; y: number };
  candidates: ReadonlyArray<EdgeCreationCandidate>;
  onChoose: (candidate: EdgeCreationCandidate) => void;
  onDismiss: () => void;
}

/**
 * Edge-creation candidate popup.
 *
 * Kept as a hand-positioned floating panel rather than a shadcn `Popover`
 * because the anchor is a React Flow drop point in screen-space, not a DOM
 * trigger element. The popup ref is used for outside-click dismissal, and
 * an Escape keydown listener is installed on the document while open.
 *
 * Rows render as plain <button> elements so callers can iterate them
 * (the existing test queries `popup.querySelectorAll("button")` and
 * expects one per candidate). The .argmap-row-hover class supplies the
 * hover/focus treatment from the global stylesheet.
 */
export function EdgeCreationPopup({
  open,
  position,
  candidates,
  onChoose,
  onDismiss,
}: EdgeCreationPopupProps): ReactElement | null {
  const popupRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onDismiss]);

  if (!open || candidates.length === 0) return null;

  return (
    <div
      ref={popupRef}
      role="menu"
      data-testid="edge-creation-popup"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: Z.popover,
        background: "var(--color-surface-elevated)",
        border: "var(--border-hairline) solid var(--color-border-subtle)",
        boxShadow: "var(--shadow-md)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-1)",
        minWidth: "160px",
      }}
    >
      {/* Rows render as plain <button> elements; hover state comes from the
          .argmap-row-hover class (defined in global.css). The shadcn
          DropdownMenu pattern would force a trigger-anchored Radix popper
          here, which doesn't fit a React-Flow-coordinate drop point. */}
      {candidates.map((c, idx) => (
        <button
          key={idx}
          type="button"
          role="menuitem"
          onClick={() => {
            onChoose(c);
            onDismiss();
          }}
          className="argmap-row-hover"
          style={{
            display: "block",
            width: "100%",
            padding: "var(--space-2) var(--space-3)",
            background: "transparent",
            border: "none",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-primary)",
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "var(--font-sans)",
          }}
        >
          {candidateLabel(c)}
        </button>
      ))}
    </div>
  );
}
