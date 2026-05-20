import type { ReactElement, ReactNode } from "react";
import {
  Tooltip as ShTooltip,
  TooltipContent,
  TooltipProvider as ShTooltipProvider,
  TooltipTrigger,
} from "#components/ui/tooltip";

// 300ms open delay matches Mac/Linear convention — fast enough that intent
// reads as "I want this tooltip" but slow enough that flyovers don't fire
// the tooltip stream. Keyboard focus is instant (no delay) because it
// represents deliberate intent, not a hover sweep.
const TOOLTIP_OPEN_DELAY_MS = 300;

export function TooltipProvider(props: { children: ReactNode }): ReactElement {
  return (
    <ShTooltipProvider delayDuration={TOOLTIP_OPEN_DELAY_MS}>
      {props.children}
    </ShTooltipProvider>
  );
}

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  disabled?: boolean;
}

/**
 * Tooltip — thin wrapper around shadcn (Radix) tooltip. Auto-mounts its own
 * TooltipProvider when none is present in the React tree so callers in
 * deeply nested surfaces (and isolated test renders) don't have to thread
 * the provider through every render path. The legacy hand-rolled tooltip
 * didn't need a provider; preserving that ergonomics here.
 */
export function Tooltip({ content, children, disabled }: TooltipProps): ReactElement {
  if (disabled || !content) return children;
  // asChild lets the trigger reuse the caller's existing element/handlers
  // instead of wrapping in an extra <button>.
  return (
    <ShTooltipProvider delayDuration={TOOLTIP_OPEN_DELAY_MS}>
      <ShTooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{content}</TooltipContent>
      </ShTooltip>
    </ShTooltipProvider>
  );
}
