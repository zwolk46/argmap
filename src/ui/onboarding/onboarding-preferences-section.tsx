import * as React from "react";
import type { ReactElement } from "react";
import { useRepository } from "@/state";
import { ConfirmDialog } from "../primitives";
import { Button } from "#components/ui/button";

export function OnboardingPreferencesSection(): ReactElement {
  const { app_state_store } = useRepository();
  const [confirm_open, setConfirmOpen] = React.useState(false);

  function handleReset(): void {
    app_state_store.getState().resetCoachmarks();
    // Also undismiss the welcome screen / first-launch so it returns.
    app_state_store.getState().undismissWarning("first_launch");
    setConfirmOpen(false);
  }

  return (
    <section
      data-testid="onboarding-preferences-section"
      className="border-t border-[var(--color-border-subtle)] p-3"
    >
      <h3 className="m-0 text-sm font-medium">Onboarding</h3>
      <p className="my-1 text-sm text-[var(--color-text-secondary)]">
        Reset coachmarks and the welcome screen to see them again.
      </p>
      <Button
        variant="outline"
        size="default"
        data-testid="reset-coachmarks-button"
        onClick={() => setConfirmOpen(true)}
      >
        Reset coachmarks
      </Button>
      <ConfirmDialog
        open={confirm_open}
        title="Reset coachmarks?"
        confirm_label="Reset"
        cancel_label="Cancel"
        onConfirm={handleReset}
        onCancel={() => setConfirmOpen(false)}
      >
        <div>All coachmarks and the welcome screen will re-appear. Your data is not affected.</div>
      </ConfirmDialog>
    </section>
  );
}
