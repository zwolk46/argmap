import type { ReactElement } from "react";
import { House } from "@phosphor-icons/react";
import { IconButton } from "../primitives/icon-button";

export interface HomeButtonProps {
  onClick: () => void;
}

export function HomeButton({ onClick }: HomeButtonProps): ReactElement {
  return (
    <IconButton aria-label="Go to home" title="Home" onClick={onClick}>
      <House size={18} weight="regular" />
    </IconButton>
  );
}
