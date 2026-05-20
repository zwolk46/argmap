import * as React from "react";
import type { ReactElement } from "react";
import { cn } from "#lib/utils";

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SegmentedToggleProps<T extends string = string> {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  aria_label?: string;
}

/**
 * SegmentedToggle — radio-group keyboard pattern. Re-skinned with Tailwind on
 * top of the new neutral palette but keeps the existing semantic contract:
 * clicking the active option still fires onChange(value), matching the
 * operating-mode-toggle expectation. Radix ToggleGroup type="single"
 * returns "" on re-click, which would break the consumer, so we keep the
 * hand-rolled radiogroup here.
 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  disabled,
  size = "md",
  aria_label,
}: SegmentedToggleProps<T>): ReactElement {
  const [focused_idx, setFocusedIdx] = React.useState<number>(-1);
  const button_refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  // §9 #5 — ARIA roving radio-group keyboard pattern. Arrow keys MOVE FOCUS
  // only; the value commits only on click / Enter / Space. Previously arrow
  // keys called onChange immediately, which triggered the operating-mode
  // warning dialog from simple keyboard navigation gestures.
  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = (idx + 1) % options.length;
      setFocusedIdx(next);
      button_refs.current[next]?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (idx - 1 + options.length) % options.length;
      setFocusedIdx(prev);
      button_refs.current[prev]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusedIdx(0);
      button_refs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      const last = options.length - 1;
      setFocusedIdx(last);
      button_refs.current[last]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(options[idx].value);
    }
  }

  return (
    <div
      role="group"
      aria-label={aria_label}
      data-slot="segmented-toggle"
      className={cn("inline-flex rounded-full border bg-muted/40 p-0.5 gap-0.5")}
    >
      {options.map((opt, idx) => {
        const is_active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={is_active}
            tabIndex={is_active ? 0 : -1}
            ref={(el) => {
              button_refs.current[idx] = el;
            }}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onFocus={() => setFocusedIdx(idx)}
            onBlur={() => setFocusedIdx(-1)}
            data-focused={focused_idx === idx ? "true" : "false"}
            data-active={is_active ? "true" : undefined}
            className={cn(
              "rounded-full font-medium font-sans transition-colors outline-none whitespace-nowrap",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50",
              size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
              disabled && "cursor-default",
              is_active
                ? "bg-background text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
