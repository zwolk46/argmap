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
      <div data-testid="interview-empty-state-complete" className="flex flex-col gap-3 p-4">
        <p className="m-0 text-sm font-medium text-foreground">All items resolved.</p>
        <p className="m-0 text-sm text-muted-foreground">
          Conclusion: <em>{props.conclusion_label}</em>
        </p>
        <Button
          variant="primary"
          size="md"
          onClick={props.on_save_milestone}
          disabled={props.saving_milestone}
          data-testid="save-milestone-button"
          className="self-start"
          title="Save this resolved session as a permanent checkpoint you can come back to."
          // L8: while saving, the spinner alone carries progress; the button
          // text stays "Save snapshot" so we don't double-signal (text +
          // spinner reading as two events).
          leading={props.saving_milestone ? <Spinner size={12} decorative /> : undefined}
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
