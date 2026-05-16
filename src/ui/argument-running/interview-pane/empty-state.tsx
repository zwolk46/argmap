import type { ReactElement } from "react";
import { Button, InlineEmpty, Spinner } from "../../primitives";

export interface InterviewEmptyStateProps {
  conclusion_label?: string;
  on_save_milestone: () => void;
  saving_milestone?: boolean;
}

export function InterviewEmptyState(props: InterviewEmptyStateProps): ReactElement {
  if (props.conclusion_label) {
    return (
      <div
        data-testid="interview-empty-state-complete"
        style={{
          padding: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--color-text-primary)",
          }}
        >
          All items resolved.
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-secondary)",
          }}
        >
          Conclusion: <em>{props.conclusion_label}</em>
        </p>
        <Button
          variant="primary"
          size="md"
          onClick={props.on_save_milestone}
          disabled={props.saving_milestone}
          data-testid="save-milestone-button"
          style={{ alignSelf: "flex-start" }}
          title="Save this resolved session as a permanent checkpoint you can come back to."
          // L8: while saving, the spinner alone carries progress; the button
          // text stays "Save snapshot" so we don't double-signal (text +
          // spinner reading as two events).
          leading={props.saving_milestone ? <Spinner size={12} /> : undefined}
          aria-busy={props.saving_milestone}
        >
          Save snapshot
        </Button>
      </div>
    );
  }
  return (
    <InlineEmpty testId="interview-empty-state-none">
      Nothing open. As you bring in premises that answer Checkpoints or select Interpretations, any
      unresolved items appear here.
    </InlineEmpty>
  );
}
