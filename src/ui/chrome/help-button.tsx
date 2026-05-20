import type { ReactElement } from "react";
import { Question } from "@phosphor-icons/react";
import { IconButton } from "../primitives/icon-button";

export interface HelpButtonProps {
  active?: boolean;
  onToggle?: () => void;
}

export function HelpButton({ active, onToggle }: HelpButtonProps): ReactElement {
  return (
    <IconButton aria-label="Help and settings" active={active} onClick={onToggle}>
      <Question size={18} weight="regular" />
    </IconButton>
  );
}
