import type { ReactElement } from "react";
import { Spinner } from "../../primitives";

export interface OutputEmptyStateProps {
  message?: string;
}

// Full-pane computing surface inside the output viewer. Uses centered
// spinner+label rather than the inline `<InlineLoading>` because the
// surrounding tabs already give horizontal context — when the body is
// empty, the page wants a hero treatment, not an inline row.
export function OutputEmptyState(props: OutputEmptyStateProps): ReactElement {
  return (
    <div
      data-testid="output-empty-state"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-3)",
        padding: "var(--space-8) var(--space-5)",
        height: "100%",
        textAlign: "center",
        color: "var(--color-text-secondary)",
        fontSize: "var(--font-size-sm)",
      }}
    >
      <Spinner size={18} />
      <span>{props.message ?? "Computing…"}</span>
    </div>
  );
}
