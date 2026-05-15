import type { ReactElement } from "react";
import { IconButton } from "../primitives/icon-button";
import { UIcon } from "../primitives/uicon";

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
      <UIcon name="clock" size={18} />
    </IconButton>
  );
}
