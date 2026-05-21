import type { ReactElement } from "react";
import { Clock } from "@phosphor-icons/react";
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
      <Clock size={18} weight="regular" />
    </IconButton>
  );
}
