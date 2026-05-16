import * as React from "react";
import type { ReactElement } from "react";
import { Dialog } from "../primitives";
import { WelcomeScreen } from "./welcome-screen";
import { NewFrameWizard, type NewFrameWizardSubmitArgs } from "./new-frame-wizard";

export interface OnboardingWizardProps {
  open: boolean;
  onSkip: () => void;
  onSubmit: (args: NewFrameWizardSubmitArgs) => Promise<void> | void;
}

export function OnboardingWizard(props: OnboardingWizardProps): ReactElement | null {
  const [stage, setStage] = React.useState<"welcome" | "wizard">("welcome");

  React.useEffect(() => {
    if (props.open) setStage("welcome");
  }, [props.open]);

  async function handleSubmit(args: NewFrameWizardSubmitArgs): Promise<void> {
    await props.onSubmit(args);
  }

  return (
    // P0-15: onboarding must NOT auto-dismiss on stray clicks or Escape.
    // The Skip button is the only intended dismissal. Before this fix, a
    // backdrop click fired Dialog.onClose → props.onSkip → permanent
    // dismissWarning("first_launch"); the user lost onboarding forever.
    //
    // Route `open` through the Dialog (instead of hard-coding `open={true}`
    // and bailing with `return null`) so the Dialog runs its exit-phase
    // animation when dismissed. Returning null bypassed that animation
    // and the screen snapped out instead of fading.
    <Dialog
      open={props.open}
      onClose={props.onSkip}
      aria_label="Onboarding"
      dismiss_on_click_outside={false}
      dismiss_on_escape={false}
    >
      {stage === "welcome" ? (
        <WelcomeScreen onStart={() => setStage("wizard")} onSkip={props.onSkip} />
      ) : (
        <NewFrameWizard onSubmit={handleSubmit} onCancel={props.onSkip} />
      )}
    </Dialog>
  );
}
