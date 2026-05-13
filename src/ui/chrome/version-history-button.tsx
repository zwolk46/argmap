import type { ReactElement } from "react";
import { IconButton } from "../primitives/icon-button";

export interface VersionHistoryButtonProps {
  active?: boolean;
  onToggle?: () => void;
}

export function VersionHistoryButton({
  active,
  onToggle,
}: VersionHistoryButtonProps): ReactElement {
  return (
    <IconButton aria-label="Version history" active={active} onClick={onToggle}>
      {/* P2: SVG matches the stroke weight of every other chrome icon. */}
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
        <path d="M3 3v4h4" />
        <path d="M3.5 7a5 5 0 1 1-1 4" />
      </svg>
    </IconButton>
  );
}
