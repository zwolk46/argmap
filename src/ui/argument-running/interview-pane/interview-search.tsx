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
          padding: "var(--space-2)",
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
          className="argmap-input"
          style={{ fontSize: "var(--font-size-xs)" }}
        />
      </div>
    );
  },
);

export function searchMatches(preview_text: string, search_text: string): boolean {
  if (search_text.length === 0) return true;
  return preview_text.toLowerCase().includes(search_text.toLowerCase());
}
