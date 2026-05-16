import type { ReactElement } from "react";
import { Pill } from "../primitives";
import { UIcon } from "../primitives/uicon";

export type MilestoneFilterValue = "milestones_only" | "all";

export interface MilestoneFilterProps {
  value: MilestoneFilterValue;
  onChange: (next: MilestoneFilterValue) => void;
}

export function MilestoneFilter({ value, onChange }: MilestoneFilterProps): ReactElement {
  const is_milestones = value === "milestones_only";
  return (
    <div
      role="group"
      aria-label="Milestone filter"
      style={{
        display: "inline-flex",
        gap: "var(--space-1)",
        padding: "var(--space-2) 0",
      }}
    >
      {/* KEEP RAW: pill-toggle filter chips (aria-pressed) wrapping Pill primitives; not the standard Button taxonomy. */}
      <button
        type="button"
        data-testid="milestone-filter-all"
        onClick={() => onChange("all")}
        aria-pressed={!is_milestones}
        title="Show every saved version including auto-saves"
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          // P1: align the :focus-visible outline with the inner Pill shape
          // so the focus ring traces the pill instead of an awkward
          // rectangle around it.
          borderRadius: "var(--radius-pill)",
        }}
      >
        <Pill
          bg={
            !is_milestones ? "var(--color-mode-current-accent-bg)" : "var(--color-status-open-bg)"
          }
          color={
            !is_milestones ? "var(--color-mode-current-accent)" : "var(--color-text-secondary)"
          }
        >
          All
        </Pill>
      </button>
      <button
        type="button"
        data-testid="milestone-filter-milestones"
        onClick={() => onChange("milestones_only")}
        aria-pressed={is_milestones}
        title="Hide auto-saves"
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          // P1: align the :focus-visible outline with the inner Pill shape
          // so the focus ring traces the pill instead of an awkward
          // rectangle around it.
          borderRadius: "var(--radius-pill)",
        }}
      >
        <Pill
          bg={is_milestones ? "var(--color-mode-current-accent-bg)" : "var(--color-status-open-bg)"}
          color={is_milestones ? "var(--color-mode-current-accent)" : "var(--color-text-secondary)"}
        >
          <span
            style={{
              color: "var(--color-milestone-star)",
              marginRight: 4,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <UIcon name="star" size={12} />
          </span>
          Milestones only
        </Pill>
      </button>
    </div>
  );
}
