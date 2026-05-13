import type { ReactElement } from "react";

export interface OutputEmptyStateProps {
  message?: string;
}

export function OutputEmptyState(props: OutputEmptyStateProps): ReactElement {
  return (
    <div
      data-testid="output-empty-state"
      style={{
        padding: "var(--space-6, 24px)",
        textAlign: "center",
        color: "var(--color-text-tertiary, #9ca3af)",
        fontSize: "var(--font-size-sm, 13px)",
      }}
    >
      {props.message ?? "Computing…"}
    </div>
  );
}
