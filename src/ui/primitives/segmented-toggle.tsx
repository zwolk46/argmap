import * as React from "react";
import type { ReactElement } from "react";

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

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  disabled,
  size = "md",
  aria_label,
}: SegmentedToggleProps<T>): ReactElement {
  const [focused_idx, setFocusedIdx] = React.useState<number>(-1);

  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = (idx + 1) % options.length;
      setFocusedIdx(next);
      onChange(options[next].value);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (idx - 1 + options.length) % options.length;
      setFocusedIdx(prev);
      onChange(options[prev].value);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(options[idx].value);
    }
  }

  const padY = size === "sm" ? "2px" : "var(--space-1)";
  const padX = size === "sm" ? "var(--space-2)" : "var(--space-3)";
  const fontSize = size === "sm" ? "var(--font-size-xs)" : "var(--font-size-sm)";

  return (
    <div
      role="group"
      aria-label={aria_label}
      style={{
        display: "inline-flex",
        borderRadius: "var(--radius-pill)",
        background: "var(--color-surface-pane)",
        border: "var(--border-hairline) solid var(--color-border-subtle)",
        padding: "2px",
        gap: "2px",
      }}
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
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onFocus={() => setFocusedIdx(idx)}
            onBlur={() => setFocusedIdx(-1)}
            data-focused={focused_idx === idx ? "true" : "false"}
            className="argmap-segmented-tab"
            style={{
              padding: `${padY} ${padX}`,
              borderRadius: "var(--radius-pill)",
              border: "none",
              background: is_active ? "var(--color-mode-current-accent-bg)" : "transparent",
              color: is_active ? "var(--color-mode-current-accent)" : "var(--color-text-secondary)",
              fontSize,
              fontWeight: is_active ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
              fontFamily: "var(--font-sans)",
              cursor: disabled ? "default" : "pointer",
              transition:
                "background-color var(--duration-slow) var(--ease-standard), color var(--duration-slow) var(--ease-standard)",
              boxShadow: is_active ? "var(--shadow-sm)" : "none",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
