import * as React from "react";
import type { ReactElement, RefObject } from "react";
import { Button, Z } from "../primitives";

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
        zIndex: Z.coachmark,
        maxWidth: 320,
        padding: "var(--space-3)",
        background: "var(--color-surface-elevated)",
        boxShadow: "var(--shadow-md)",
        borderRadius: "var(--radius-md)",
        border: "var(--border-thin) solid var(--color-border-default)",
      }}
    >
      <p
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-primary)",
          margin: 0,
        }}
      >
        {props.message}
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "var(--space-2)",
          marginTop: "var(--space-2)",
        }}
      >
        {props.on_learn_more ? (
          <Button
            variant="ghost"
            size="sm"
            data-testid="coachmark-learn-more"
            onClick={props.on_learn_more}
          >
            Learn more
          </Button>
        ) : null}
        <Button
          variant="primary"
          size="sm"
          data-testid="coachmark-dismiss"
          onClick={props.on_dismiss}
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
