import type { ReactElement } from "react";
import { IconButton } from "../primitives/icon-button";
import { UIcon } from "../primitives/uicon";

export interface HelpButtonProps {
  active?: boolean;
  onToggle?: () => void;
}

export function HelpButton({ active, onToggle }: HelpButtonProps): ReactElement {
  return (
    <IconButton aria-label="Help and settings" active={active} onClick={onToggle}>
      <UIcon name="question" size={18} />
    </IconButton>
  );
}
