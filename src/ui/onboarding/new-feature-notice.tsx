import type { ReactElement } from "react";
import { Button } from "#components/ui/button";
import { Badge } from "#components/ui/badge";

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
      className="max-w-[360px] rounded-2xl bg-popover p-3 text-popover-foreground ring-1 ring-foreground/10 shadow-md"
    >
      <header className="mb-2 flex items-center gap-2">
        <Badge className="bg-[var(--color-mode-current-accent-bg)] text-[var(--color-mode-current-accent)]">
          New
        </Badge>
        <span className="text-sm font-medium">{props.title}</span>
      </header>
      <p className="m-0 text-sm">{props.message}</p>
      <div className="mt-2 flex justify-end gap-2">
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
          variant="default"
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
