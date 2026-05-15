import type { ReactElement } from "react";
import { Button, Pill } from "../primitives";

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
        padding: "var(--space-3)",
        background: "var(--color-surface-elevated)",
        boxShadow: "var(--shadow-md)",
        borderRadius: "var(--radius-md)",
        border: "var(--border-thin) solid var(--color-border-default)",
        maxWidth: 360,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          marginBottom: "var(--space-2)",
        }}
      >
        <Pill
          bg="var(--color-mode-current-accent-bg)"
          color="var(--color-mode-current-accent)"
        >
          New
        </Pill>
        <span
          style={{ fontWeight: "var(--font-weight-medium)", fontSize: "var(--font-size-sm)" }}
        >
          {props.title}
        </span>
      </header>
      <p style={{ fontSize: "var(--font-size-sm)", margin: 0 }}>{props.message}</p>
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
            data-testid="new-feature-learn-more"
            onClick={props.on_learn_more}
          >
            Tell me more
          </Button>
        ) : null}
        <Button
          variant="primary"
          size="sm"
          data-testid="new-feature-dismiss"
          onClick={props.on_dismiss}
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
