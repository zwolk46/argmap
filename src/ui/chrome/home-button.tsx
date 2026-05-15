import type { ReactElement } from "react";
import { IconButton } from "../primitives/icon-button";
import { UIcon } from "../primitives/uicon";

export interface HomeButtonProps {
  onClick: () => void;
}

export function HomeButton({ onClick }: HomeButtonProps): ReactElement {
  return (
    <IconButton aria-label="Go to home" title="Home" onClick={onClick}>
      <UIcon name="home" size={18} />
    </IconButton>
  );
}
