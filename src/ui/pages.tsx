import type { ReactElement } from "react";
import type { FrameId, SessionId } from "@/schema";

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
      {label} — page not yet implemented (coming in I.9b/c/d)
    </div>
  );
}

export function FrameBuildingPage(props: { frame_id: FrameId }): ReactElement {
  return <PlaceholderPage label={`Frame Building (${props.frame_id})`} />;
}

export function ArgumentRunningPage(props: { session_id: SessionId }): ReactElement {
  return <PlaceholderPage label={`Argument Running (${props.session_id})`} />;
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
