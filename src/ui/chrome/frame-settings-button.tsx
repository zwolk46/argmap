import type { ReactElement } from "react";
import { IconButton } from "../primitives/icon-button";
import { UIcon } from "../primitives/uicon";

export interface FrameSettingsButtonProps {
  onOpen?: () => void;
  disabled?: boolean;
}

export function FrameSettingsButton({ onOpen, disabled }: FrameSettingsButtonProps): ReactElement {
  return (
    <IconButton aria-label="Frame settings" onClick={onOpen} disabled={disabled}>
      <UIcon name="settings" size={18} />
    </IconButton>
  );
}
