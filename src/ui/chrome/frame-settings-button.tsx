import type { ReactElement } from "react";
import { IconButton } from "../primitives/icon-button";

export interface FrameSettingsButtonProps {
  onOpen?: () => void;
  disabled?: boolean;
}

export function FrameSettingsButton({ onOpen, disabled }: FrameSettingsButtonProps): ReactElement {
  return (
    <IconButton aria-label="Frame settings" onClick={onOpen} disabled={disabled}>
      <svg
        width={16}
        height={16}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="8" cy="8" r="2.1" />
        <path d="M8 1.5v1.6M8 12.9v1.6M14.5 8h-1.6M3.1 8H1.5M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1M12.6 12.6l-1.1-1.1M4.5 4.5L3.4 3.4" />
      </svg>
    </IconButton>
  );
}
