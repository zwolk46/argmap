import * as React from "react";
import type { ReactElement } from "react";
import type { ConditionKind, ModeFlavor } from "@/schema";
import { OFFERED_CONDITIONS_BY_MODE_FLAVOR, CONDITION_KIND_PRIORITY } from "@/schema";

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
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => set_open((v) => !v)}
        style={{
          padding: "4px 10px",
          background: "transparent",
          border: "1px dashed var(--color-border, #e5e7eb)",
          borderRadius: "var(--radius-sm, 4px)",
          cursor: "pointer",
          fontSize: "var(--font-size-sm, 13px)",
          color: "var(--color-text-secondary, #6b7280)",
        }}
      >
        + Add condition
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 100,
            background: "var(--color-surface-elevated, #fff)",
            border: "1px solid var(--color-border, #e5e7eb)",
            borderRadius: "var(--radius-md, 8px)",
            boxShadow: "var(--shadow-md, 0 4px 6px rgba(0,0,0,0.1))",
            minWidth: "220px",
            padding: "4px 0",
          }}
          role="menu"
        >
          {available.map((kind) => (
            <button
              key={kind}
              type="button"
              role="menuitem"
              onClick={() => handlePick(kind)}
              style={MENU_ITEM_STYLE}
              title={CONDITION_DESCRIPTIONS[kind]}
            >
              <div style={{ fontWeight: 500 }}>{CONDITION_LABELS[kind]}</div>
              {CONDITION_DESCRIPTIONS[kind] && (
                <div
                  style={{
                    fontSize: "var(--font-size-xs, 11px)",
                    color: "var(--color-text-tertiary, #9ca3af)",
                    marginTop: "1px",
                  }}
                >
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
              style={{
                ...MENU_ITEM_STYLE,
                borderTop: "1px solid var(--color-border, #e5e7eb)",
                marginTop: "4px",
              }}
            >
              <div style={{ fontWeight: 500 }}>+ Add "any of" group</div>
              <div
                style={{
                  fontSize: "var(--font-size-xs, 11px)",
                  color: "var(--color-text-tertiary, #9ca3af)",
                  marginTop: "1px",
                }}
              >
                Adds a disjunctive group (at most one per policy).
              </div>
            </button>
          )}
          {available.length === 0 && !show_any_of && (
            <div
              style={{
                padding: "8px 12px",
                fontSize: "var(--font-size-xs, 11px)",
                color: "var(--color-text-tertiary, #9ca3af)",
              }}
            >
              All conditions already added.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const MENU_ITEM_STYLE: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 12px",
  background: "transparent",
  border: "none",
  textAlign: "left",
  cursor: "pointer",
  fontSize: "var(--font-size-sm, 13px)",
  color: "var(--color-text-primary, #111827)",
};
