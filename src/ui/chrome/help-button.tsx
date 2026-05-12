import type { ReactElement } from "react";
import { IconButton } from "../primitives/icon-button";

export interface HelpButtonProps {
  active?: boolean;
  onToggle?: () => void;
}

export function HelpButton({ active, onToggle }: HelpButtonProps): ReactElement {
  return (
    <IconButton aria-label="Help and glossary" active={active} onClick={onToggle}>
      ?
    </IconButton>
  );
}
