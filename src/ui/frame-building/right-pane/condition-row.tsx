import type { ReactElement } from "react";
import { X } from "@phosphor-icons/react";
import type { Condition, ConditionKind, BurdenLevel } from "@/schema";
import { IconButton } from "../../primitives";
import { Input } from "#components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components/ui/select";

export interface ConditionRowProps {
  condition: Condition;
  on_change: (updated: Condition) => void;
  on_remove: () => void;
}

const KIND_LABELS: Record<ConditionKind, string> = {
  premise_attached: "Premise attached",
  interpretation_selected: "Interpretation selected",
  all_children_resolved: "All children resolved",
  path_complete: "Path complete",
  not_contradicted: "Not contradicted",
  premise_kind_in: "Premise kind in",
  burden_met: "Burden met",
  authority_required: "Authority required",
  authority_binding: "Authority binding",
  not_distinguished: "Not distinguished",
  standard_of_review_applied: "Standard of review applied",
  not_foreclosed: "Not foreclosed",
};

const BURDEN_LEVELS: BurdenLevel[] = [
  "preponderance",
  "clear_and_convincing",
  "beyond_reasonable_doubt",
  "scintilla",
  "substantial_evidence",
];

export function conditionLabel(condition: Condition): string {
  return KIND_LABELS[condition.kind] ?? condition.kind;
}

export function ConditionRow(props: ConditionRowProps): ReactElement {
  const { condition, on_change, on_remove } = props;

  return (
    <div className="mb-1 flex items-start gap-2 rounded-md bg-muted p-2">
      {/* Kind pill */}
      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
        {KIND_LABELS[condition.kind] ?? condition.kind}
      </span>

      {/* Parameters */}
      <div className="flex-1">
        {condition.kind === "burden_met" && (
          <Select
            value={condition.level}
            onValueChange={(value) => on_change({ ...condition, level: value as BurdenLevel })}
          >
            <SelectTrigger className="h-7 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BURDEN_LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {condition.kind === "premise_kind_in" && (
          <Input
            type="text"
            value={condition.kinds.join(", ")}
            onChange={(e) =>
              on_change({
                ...condition,
                kinds: e.currentTarget.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Comma-separated kinds…"
            className="h-7 px-2 text-xs"
          />
        )}
      </div>

      {/* Remove button */}
      <IconButton aria-label="Remove condition" onClick={on_remove} size="sm">
        <X size={14} />
      </IconButton>
    </div>
  );
}
