import * as React from "react";
import type { ReactElement } from "react";

export interface InterviewSearchProps {
  value: string;
  on_change: (next: string) => void;
}

export const InterviewSearch = React.forwardRef<HTMLInputElement, InterviewSearchProps>(
  function InterviewSearch({ value, on_change }, ref): ReactElement {
    return (
      <div
        style={{
          padding: "var(--space-2, 8px)",
          borderBottom: "var(--border-thin) solid var(--color-border-tertiary)",
        }}
      >
        <input
          ref={ref}
          type="search"
          data-testid="interview-search"
          placeholder="Search items…"
          value={value}
          onChange={(e) => on_change(e.target.value)}
          style={{
            width: "100%",
            padding: "4px 8px",
            border: "var(--border-thin) solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md, 6px)",
            fontSize: "var(--font-size-xs, 11px)",
            background: "var(--color-surface-elevated, #ffffff)",
          }}
        />
      </div>
    );
  },
);

export function searchMatches(preview_text: string, search_text: string): boolean {
  if (search_text.length === 0) return true;
  return preview_text.toLowerCase().includes(search_text.toLowerCase());
}
