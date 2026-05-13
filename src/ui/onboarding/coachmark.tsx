import * as React from "react";
import type { ReactElement, RefObject } from "react";

export interface CoachmarkProps {
  anchor_ref: RefObject<HTMLElement | null>;
  message: string;
  on_dismiss: () => void;
  on_learn_more?: () => void;
}

export function Coachmark(props: CoachmarkProps): ReactElement | null {
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  React.useEffect(() => {
    const el = props.anchor_ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 12, left: rect.left });
  }, [props.anchor_ref]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") props.on_dismiss();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [props]);

  if (!pos) return null;
  return (
    <div
      data-testid="coachmark"
      role="dialog"
      aria-label="Coachmark"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 200,
        maxWidth: 320,
        padding: "var(--space-3, 12px)",
        background: "var(--color-surface-elevated, #ffffff)",
        boxShadow: "var(--shadow-md, 0 4px 12px rgba(0,0,0,0.1))",
        borderRadius: "var(--radius-md, 6px)",
        border: "var(--border-thin, 1px) solid var(--color-border-default, #e5e7eb)",
      }}
    >
      <p
        style={{
          fontSize: "var(--font-size-sm, 13px)",
          color: "var(--color-text-primary, #111827)",
          margin: 0,
        }}
      >
        {props.message}
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "var(--space-2, 8px)",
          marginTop: "var(--space-2, 8px)",
        }}
      >
        {props.on_learn_more ? (
          <button
            type="button"
            data-testid="coachmark-learn-more"
            onClick={props.on_learn_more}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-mode-current-accent, #1d4ed8)",
              fontSize: "var(--font-size-xs, 11px)",
              cursor: "pointer",
            }}
          >
            Learn more
          </button>
        ) : null}
        <button
          type="button"
          data-testid="coachmark-dismiss"
          onClick={props.on_dismiss}
          style={{
            background: "var(--color-mode-current-accent, #1d4ed8)",
            color: "var(--color-text-on-accent, #ffffff)",
            border: "none",
            borderRadius: "var(--radius-md, 6px)",
            padding: "var(--space-1, 4px) var(--space-3, 12px)",
            fontSize: "var(--font-size-xs, 11px)",
            cursor: "pointer",
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
