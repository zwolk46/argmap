import * as React from "react";
import type { ReactElement } from "react";
import type { EdgeCreationCandidate } from "./edges/edge-validity";
import { candidateLabel } from "./edges/edge-validity";

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
        zIndex: 1000,
        background: "var(--color-surface-elevated)",
        boxShadow: "var(--shadow-md)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-1)",
        minWidth: "160px",
      }}
    >
      {candidates.map((c, idx) => (
        <button
          key={idx}
          onClick={() => {
            onChoose(c);
            onDismiss();
          }}
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
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          {candidateLabel(c)}
        </button>
      ))}
    </div>
  );
}
