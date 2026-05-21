import type { ReactElement } from "react";
import { useReduceMotion } from "@/ui";

export interface RecomputeIndicatorProps {
  counter: number;
}

export function RecomputeIndicator(props: RecomputeIndicatorProps): ReactElement {
  const reduce = useReduceMotion();
  // The pulse animation is keyed off the mode-current-accent token (preserved
  // domain palette). The `argmap-recompute-pulse` / `argmap-recompute-flash`
  // keyframes still live in globals.css; we re-key on counter to replay them.
  return (
    <span
      key={props.counter}
      data-testid="recompute-indicator"
      data-counter={props.counter}
      aria-hidden
      className="inline-block size-2 shrink-0 rounded-full opacity-0"
      style={{
        background: "var(--color-mode-current-accent)",
        animation: reduce
          ? "argmap-recompute-flash 600ms ease-out"
          : "argmap-recompute-pulse 600ms var(--ease-soft)",
      }}
    />
  );
}
