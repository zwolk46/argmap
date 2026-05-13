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

  if (!props.open) return null;

  async function handleSubmit(args: NewFrameWizardSubmitArgs): Promise<void> {
    await props.onSubmit(args);
  }

  return (
    <Dialog open={true} onClose={props.onSkip} aria_label="Onboarding">
      {stage === "welcome" ? (
        <WelcomeScreen onStart={() => setStage("wizard")} onSkip={props.onSkip} />
      ) : (
        <NewFrameWizard onSubmit={handleSubmit} onCancel={props.onSkip} />
      )}
    </Dialog>
  );
}
