import type { ReactElement } from "react";
import { CaretDown } from "@phosphor-icons/react";
import type { OrphanResolution } from "@/state";
import { Button } from "#components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu";

export interface ResolutionPickerProps {
  value: OrphanResolution["kind"];
  onChange: (kind: OrphanResolution["kind"]) => void;
  /**
   * When false, the Reattach option is hidden so the user can't commit a
   * reattach resolution with no target. The parent computes this from
   * `candidate.reattach_candidates.length > 0`.
   */
  reattach_available?: boolean;
}

// "no_op" is the data model's term for "keep the row, do nothing with
// it during migration"; the UI surfaces it as "Keep" so the user
// doesn't have to learn programming jargon.
const ALL_OPTIONS: ReadonlyArray<{ value: OrphanResolution["kind"]; label: string }> = [
  { value: "discard", label: "Discard" },
  { value: "reattach", label: "Reattach" },
  { value: "no_op", label: "Keep" },
];

function labelFor(value: OrphanResolution["kind"]): string {
  return ALL_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function ResolutionPicker(props: ResolutionPickerProps): ReactElement {
  const options =
    props.reattach_available === false
      ? ALL_OPTIONS.filter((o) => o.value !== "reattach")
      : ALL_OPTIONS;
  return (
    <div data-testid="resolution-picker">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            data-testid="resolution-picker-trigger"
            className="min-w-[110px] justify-between"
          >
            {labelFor(props.value)}
            <CaretDown size={12} data-icon="inline-end" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {options.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              data-testid={`resolution-option-${opt.value}`}
              onSelect={() => props.onChange(opt.value)}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
