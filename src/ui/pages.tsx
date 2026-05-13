export { FrameBuildingPage } from "./frame-building";
export type { FrameBuildingPageProps } from "./frame-building";

export { ArgumentRunningPage } from "./argument-running";
export type { ArgumentRunningPageProps } from "./argument-running";

import type { ReactElement } from "react";

function PlaceholderPage({ label }: { label: string }): ReactElement {
  return (
    <div
      style={{
        padding: "var(--space-6)",
        fontFamily: "var(--font-sans)",
        color: "var(--color-text-secondary)",
        fontSize: "var(--font-size-sm)",
      }}
    >
      {label} — page not yet implemented (coming in I.9d)
    </div>
  );
}

export function VersionHistoryPane(props: {
  open: boolean;
  onClose: () => void;
}): ReactElement | null {
  if (!props.open) return null;
  return (
    <div role="dialog" aria-label="Version history">
      <PlaceholderPage label="Version History" />
      <button onClick={props.onClose}>Close</button>
    </div>
  );
}

export function OnboardingWizard(props: {
  open: boolean;
  onClose: () => void;
}): ReactElement | null {
  if (!props.open) return null;
  return (
    <div role="dialog" aria-label="Onboarding wizard">
      <PlaceholderPage label="Onboarding Wizard" />
      <button onClick={props.onClose}>Close</button>
    </div>
  );
}
