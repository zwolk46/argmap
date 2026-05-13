import type { ReactElement } from "react";
import { Pill } from "../primitives";

export interface NewFeatureNoticeProps {
  title: string;
  message: string;
  on_dismiss: () => void;
  on_learn_more?: () => void;
}

export function NewFeatureNotice(props: NewFeatureNoticeProps): ReactElement {
  return (
    <div
      data-testid="new-feature-notice"
      role="status"
      style={{
        padding: "var(--space-3, 12px)",
        background: "var(--color-surface-elevated, #ffffff)",
        boxShadow: "var(--shadow-md, 0 4px 12px rgba(0,0,0,0.1))",
        borderRadius: "var(--radius-md, 6px)",
        border: "var(--border-thin, 1px) solid var(--color-border-default, #e5e7eb)",
        maxWidth: 360,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2, 8px)",
          marginBottom: "var(--space-2, 8px)",
        }}
      >
        <Pill
          bg="var(--color-mode-current-accent-bg, #dbeafe)"
          color="var(--color-mode-current-accent, #1d4ed8)"
        >
          New
        </Pill>
        <span style={{ fontWeight: 500, fontSize: "var(--font-size-sm, 13px)" }}>
          {props.title}
        </span>
      </header>
      <p style={{ fontSize: "var(--font-size-sm, 13px)", margin: 0 }}>{props.message}</p>
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
            data-testid="new-feature-learn-more"
            onClick={props.on_learn_more}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-mode-current-accent, #1d4ed8)",
              fontSize: "var(--font-size-xs, 11px)",
              cursor: "pointer",
            }}
          >
            Tell me more
          </button>
        ) : null}
        <button
          type="button"
          data-testid="new-feature-dismiss"
          onClick={props.on_dismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
