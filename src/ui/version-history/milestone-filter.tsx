import type { ReactElement } from "react";
import { Star } from "@phosphor-icons/react";
import { ToggleGroup, ToggleGroupItem } from "#components/ui/toggle-group";

export type MilestoneFilterValue = "milestones_only" | "all";

export interface MilestoneFilterProps {
  value: MilestoneFilterValue;
  onChange: (next: MilestoneFilterValue) => void;
}

export function MilestoneFilter({ value, onChange }: MilestoneFilterProps): ReactElement {
  return (
    <div className="py-2">
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(next) => {
          if (next === "all" || next === "milestones_only") onChange(next);
        }}
        variant="outline"
        size="sm"
        spacing={0}
        aria-label="Milestone filter"
      >
        <ToggleGroupItem
          value="all"
          data-testid="milestone-filter-all"
          aria-pressed={value === "all"}
          title="Show every saved version including auto-saves"
        >
          All
        </ToggleGroupItem>
        <ToggleGroupItem
          value="milestones_only"
          data-testid="milestone-filter-milestones"
          aria-pressed={value === "milestones_only"}
          title="Hide auto-saves"
        >
          <Star
            weight="fill"
            className="mr-1"
            style={{ color: "var(--color-milestone-star)" }}
            aria-hidden="true"
          />
          Milestones only
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
