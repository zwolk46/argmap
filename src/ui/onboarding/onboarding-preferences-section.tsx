import * as React from "react";
import type { ReactElement } from "react";
import { useRepository } from "@/state";
import { Button, ConfirmDialog } from "../primitives";

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
      style={{
        padding: "var(--space-3)",
        borderTop: "var(--border-hairline) solid var(--color-border-subtle)",
      }}
    >
      <h3
        style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-medium)",
          margin: 0,
        }}
      >
        Onboarding
      </h3>
      <p
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-secondary)",
          margin: "var(--space-1) 0",
        }}
      >
        Reset coachmarks and the welcome screen to see them again.
      </p>
      <Button
        variant="secondary"
        size="md"
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
