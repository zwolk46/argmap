import type { ReactElement } from "react";
import { IconButton } from "../primitives/icon-button";

export interface FrameSettingsButtonProps {
  onOpen?: () => void;
}

export function FrameSettingsButton({ onOpen }: FrameSettingsButtonProps): ReactElement {
  return (
    <IconButton aria-label="Frame settings" onClick={onOpen}>
      ⚙
    </IconButton>
  );
}
