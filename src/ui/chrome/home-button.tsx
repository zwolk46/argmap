import type { ReactElement } from "react";
import { IconButton } from "../primitives/icon-button";

export interface HomeButtonProps {
  onClick: () => void;
}

export function HomeButton({ onClick }: HomeButtonProps): ReactElement {
  return (
    <IconButton aria-label="Go to home" title="Home" onClick={onClick}>
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
        <path d="M2 7l6-5 6 5" />
        <path d="M3.5 6v7h9V6" />
        <path d="M6.5 13V9.5h3V13" />
      </svg>
    </IconButton>
  );
}
