import type { ReactElement } from "react";
import { IconButton } from "../primitives/icon-button";

export interface HelpButtonProps {
  active?: boolean;
  onToggle?: () => void;
}

export function HelpButton({ active, onToggle }: HelpButtonProps): ReactElement {
  return (
    <IconButton aria-label="Help and glossary" active={active} onClick={onToggle}>
      <svg
        width={16}
        height={16}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="8" cy="8" r="6.5" />
        <path d="M5.7 6c.05-1.5 1.2-2.4 2.4-2.4 1.4 0 2.4 1 2.4 2.1 0 .8-.5 1.3-1.2 1.7-.85.5-1.15.95-1.15 1.8" />
        <circle cx="8" cy="11.3" r="0.55" fill="currentColor" />
      </svg>
    </IconButton>
  );
}
