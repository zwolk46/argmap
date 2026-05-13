import type { ReactElement } from "react";

export interface InterviewEmptyStateProps {
  conclusion_label?: string;
  on_save_milestone: () => void;
}

export function InterviewEmptyState(props: InterviewEmptyStateProps): ReactElement {
  if (props.conclusion_label) {
    return (
      <div
        data-testid="interview-empty-state-complete"
        style={{
          padding: "var(--space-4, 16px)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3, 12px)",
        }}
      >
        <p style={{ margin: 0, fontSize: "var(--font-size-sm, 13px)" }}>All items resolved.</p>
        <p
          style={{
            margin: 0,
            fontSize: "var(--font-size-sm, 13px)",
            color: "var(--color-text-secondary, #6b7280)",
          }}
        >
          Conclusion: <em>{props.conclusion_label}</em>
        </p>
        <button
          type="button"
          onClick={props.on_save_milestone}
          data-testid="save-milestone-button"
          style={{
            padding: "6px 12px",
            background: "var(--color-background-accent, #dbeafe)",
            color: "var(--color-text-accent, #1d4ed8)",
            border: "none",
            borderRadius: "var(--border-radius-md, 6px)",
            cursor: "pointer",
            fontSize: "var(--font-size-xs, 11px)",
            alignSelf: "flex-start",
          }}
        >
          Save milestone
        </button>
      </div>
    );
  }
  return (
    <div
      data-testid="interview-empty-state-none"
      style={{
        padding: "var(--space-4, 16px)",
        color: "var(--color-text-tertiary, #9ca3af)",
        fontSize: "var(--font-size-sm, 13px)",
      }}
    >
      No open items.
    </div>
  );
}
