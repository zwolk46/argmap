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
      role="status"
      aria-live="polite"
      className="flex h-full flex-col items-center justify-center gap-3 px-5 py-8 text-center text-sm text-muted-foreground"
    >
      <Spinner size={18} decorative />
      <span>{props.message ?? "Computing…"}</span>
    </div>
  );
}
