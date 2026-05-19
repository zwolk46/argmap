import type { ReactElement } from "react";
import { IconButton } from "../primitives/icon-button";
import { UIcon } from "../primitives/uicon";

export interface FrameSettingsButtonProps {
  onOpen?: () => void;
  disabled?: boolean;
  /**
   * Override the default "Frame settings" labels. Used in Argument Running
   * where the same icon opens session settings — the button stays the same
   * but the user-facing label tracks the action.
   */
  aria_label?: string;
  title?: string;
}

export function FrameSettingsButton({
  onOpen,
  disabled,
  aria_label = "Frame settings",
  title,
}: FrameSettingsButtonProps): ReactElement {
  return (
    <IconButton aria-label={aria_label} title={title} onClick={onOpen} disabled={disabled}>
      <UIcon name="settings" size={18} />
    </IconButton>
  );
}
