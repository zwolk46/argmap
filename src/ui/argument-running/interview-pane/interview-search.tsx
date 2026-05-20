import * as React from "react";
import type { ReactElement } from "react";
import { Input } from "#components/ui/input";

export interface InterviewSearchProps {
  value: string;
  on_change: (next: string) => void;
}

export const InterviewSearch = React.forwardRef<HTMLInputElement, InterviewSearchProps>(
  function InterviewSearch({ value, on_change }, ref): ReactElement {
    return (
      <div className="border-b p-2">
        <Input
          ref={ref}
          type="search"
          data-testid="interview-search"
          placeholder="Search items…"
          value={value}
          onChange={(e) => on_change(e.target.value)}
          className="h-7 text-xs"
        />
      </div>
    );
  },
);

export function searchMatches(preview_text: string, search_text: string): boolean {
  if (search_text.length === 0) return true;
  return preview_text.toLowerCase().includes(search_text.toLowerCase());
}
