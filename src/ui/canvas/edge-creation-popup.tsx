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
      {/* KEEP RAW: dropdown menu rows in a popup, not the standard Button taxonomy. */}
      {candidates.map((c, idx) => (
        <button
          key={idx}
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
