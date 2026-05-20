import * as React from "react";
import type { ReactElement } from "react";
import { Plus } from "@phosphor-icons/react";
import type { ConditionKind, ModeFlavor } from "@/schema";
import { OFFERED_CONDITIONS_BY_MODE_FLAVOR, CONDITION_KIND_PRIORITY } from "@/schema";
import { Button } from "#components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "#components/ui/popover";
import { cn } from "#lib/utils";

export interface ConditionPickerProps {
  mode_flavor: ModeFlavor;
  exclude_kinds: ReadonlySet<ConditionKind>;
  on_pick: (kind: ConditionKind | "any_of") => void;
  show_any_of?: boolean;
}

const CONDITION_LABELS: Record<ConditionKind, string> = {
  premise_attached: "Premise attached",
  interpretation_selected: "Interpretation selected",
  all_children_resolved: "All children resolved",
  path_complete: "Path complete",
  not_contradicted: "Not contradicted",
  premise_kind_in: "Premise kind in…",
  burden_met: "Burden met",
  authority_required: "Authority required",
  authority_binding: "Authority binding",
  not_distinguished: "Not distinguished",
  standard_of_review_applied: "Standard of review applied",
  not_foreclosed: "Not foreclosed",
};

const CONDITION_DESCRIPTIONS: Partial<Record<ConditionKind, string>> = {
  premise_attached: "At least one premise is attached to this node.",
  interpretation_selected: "An interpretation has been selected for this term.",
  all_children_resolved: "All child nodes have satisfied conditions.",
  path_complete: "The full logical path to a conclusion is complete.",
  not_contradicted: "No contradicting premise is attached.",
  premise_kind_in: "At least one premise is of the specified kind(s).",
  burden_met: "The burden of proof has been met at the specified level.",
  authority_required: "A cited authority is required.",
  authority_binding: "The cited authority must be binding.",
  not_distinguished: "No authority has been distinguished.",
  standard_of_review_applied: "The standard of review has been applied.",
  not_foreclosed: "This node is not foreclosed.",
};

export function ConditionPicker(props: ConditionPickerProps): ReactElement {
  const { mode_flavor, exclude_kinds, on_pick, show_any_of = false } = props;
  const [open, set_open] = React.useState(false);

  const offered = OFFERED_CONDITIONS_BY_MODE_FLAVOR[mode_flavor] ?? CONDITION_KIND_PRIORITY;
  const available = offered.filter((k) => !exclude_kinds.has(k));

  function handlePick(kind: ConditionKind | "any_of") {
    set_open(false);
    on_pick(kind);
  }

  return (
    <Popover open={open} onOpenChange={set_open}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" aria-haspopup="menu">
          <Plus size={12} />
          Add condition
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-1" role="menu">
        {/* KEEP RAW: condition-picker dropdown menu rows (role="menuitem"), not the standard Button taxonomy. */}
        {available.map((kind) => (
          <button
            key={kind}
            type="button"
            role="menuitem"
            onClick={() => handlePick(kind)}
            title={CONDITION_DESCRIPTIONS[kind]}
            className={cn(
              "block w-full cursor-pointer rounded-md border-0 bg-transparent px-3 py-2 text-left text-sm text-foreground",
              "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <div className="font-medium">{CONDITION_LABELS[kind]}</div>
            {CONDITION_DESCRIPTIONS[kind] && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                {CONDITION_DESCRIPTIONS[kind]}
              </div>
            )}
          </button>
        ))}
        {show_any_of && (
          <button
            type="button"
            role="menuitem"
            onClick={() => handlePick("any_of")}
            className={cn(
              "mt-1 block w-full cursor-pointer rounded-md border-0 border-t border-border bg-transparent px-3 py-2 text-left text-sm text-foreground",
              "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <div className="font-medium">+ Add &quot;any of&quot; group</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Adds a disjunctive group (at most one per policy).
            </div>
          </button>
        )}
        {available.length === 0 && !show_any_of && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            All conditions already added.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
