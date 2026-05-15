import type { ReactElement } from "react";
import type { SatisfactionPolicy, Condition, ConditionKind } from "@/schema";
import type { ModeFlavor } from "@/schema";
import { CONDITION_KIND_PRIORITY } from "@/schema";
import { ConditionRow } from "./condition-row";
import { ConditionPicker } from "./condition-picker";

export interface ConditionListProps {
  policy: SatisfactionPolicy;
  on_change: (next: SatisfactionPolicy) => void;
  mode_flavor: ModeFlavor;
}

function sortByPriority(conditions: Condition[]): Condition[] {
  return [...conditions].sort(
    (a, b) =>
      (CONDITION_KIND_PRIORITY.indexOf(a.kind) ?? 999) -
      (CONDITION_KIND_PRIORITY.indexOf(b.kind) ?? 999),
  );
}

function defaultCondition(kind: ConditionKind): Condition {
  switch (kind) {
    case "burden_met":
      return { kind: "burden_met", level: "preponderance" };
    case "premise_kind_in":
      return { kind: "premise_kind_in", kinds: [] };
    default:
      return { kind } as Condition;
  }
}

export function ConditionList(props: ConditionListProps): ReactElement {
  const { policy, on_change, mode_flavor } = props;

  const sorted_all_of = sortByPriority(policy.all_of ?? []);
  const any_of = policy.any_of;

  const existing_kinds = new Set<ConditionKind>(sorted_all_of.map((c) => c.kind));
  const has_any_of = !!any_of && any_of.length > 0;

  function updateAllOf(index: number, updated: Condition) {
    const next = sorted_all_of.map((c, i) => (i === index ? updated : c));
    on_change({ ...policy, all_of: next });
  }

  function removeFromAllOf(index: number) {
    const next = sorted_all_of.filter((_, i) => i !== index);
    on_change({ ...policy, all_of: next });
  }

  function addCondition(kind: ConditionKind | "any_of") {
    if (kind === "any_of") {
      on_change({ ...policy, any_of: [] });
    } else {
      const cond = defaultCondition(kind);
      on_change({ ...policy, all_of: sortByPriority([...sorted_all_of, cond]) });
    }
  }

  function updateAnyOf(index: number, updated: Condition) {
    const next = (any_of ?? []).map((c, i) => (i === index ? updated : c));
    on_change({ ...policy, any_of: next });
  }

  function removeFromAnyOf(index: number) {
    const next = (any_of ?? []).filter((_, i) => i !== index);
    on_change({ ...policy, any_of: next.length > 0 ? next : undefined });
  }

  function addToAnyOf(kind: ConditionKind) {
    const cond = defaultCondition(kind);
    on_change({ ...policy, any_of: [...(any_of ?? []), cond] });
  }

  return (
    <div>
      {/* AND list */}
      {sorted_all_of.map((condition, i) => (
        <ConditionRow
          key={`${condition.kind}-${i}`}
          condition={condition}
          on_change={(updated) => updateAllOf(i, updated)}
          on_remove={() => removeFromAllOf(i)}
        />
      ))}

      {/* AnyOf group */}
      {has_any_of && (
        <div
          style={{
            marginTop: "var(--space-2)",
            padding: "var(--space-2)",
            border: "1px solid var(--color-border, #e5e7eb)",
            borderRadius: "var(--radius-sm, 4px)",
          }}
        >
          <h3 className="argmap-section-heading" style={{ marginBottom: "var(--space-1)" }}>
            Any of (disjunction)
          </h3>
          {(any_of ?? []).map((condition, i) => (
            <ConditionRow
              key={`anyof-${condition.kind}-${i}`}
              condition={condition}
              on_change={(updated) => updateAnyOf(i, updated)}
              on_remove={() => removeFromAnyOf(i)}
            />
          ))}
          <ConditionPicker
            mode_flavor={mode_flavor}
            exclude_kinds={new Set()}
            on_pick={(kind) => {
              if (kind !== "any_of") addToAnyOf(kind);
            }}
            show_any_of={false}
          />
        </div>
      )}

      {/* Add condition picker */}
      <div style={{ marginTop: "var(--space-2)" }}>
        <ConditionPicker
          mode_flavor={mode_flavor}
          exclude_kinds={existing_kinds}
          on_pick={addCondition}
          show_any_of={!has_any_of}
        />
      </div>
    </div>
  );
}
