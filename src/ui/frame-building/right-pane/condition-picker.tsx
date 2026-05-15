import * as React from "react";
import type { ReactElement } from "react";
import type { ConditionKind, ModeFlavor } from "@/schema";
import { OFFERED_CONDITIONS_BY_MODE_FLAVOR, CONDITION_KIND_PRIORITY } from "@/schema";
import { Button, Z } from "../../primitives";

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

  // Escape closes the menu and returns focus to the trigger; click-outside
  // captured via a document-level pointerdown listener.
  const trigger_ref = React.useRef<HTMLButtonElement | null>(null);
  const menu_ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        set_open(false);
        trigger_ref.current?.focus();
      }
    }
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node | null;
      if (t && menu_ref.current?.contains(t)) return;
      if (t && trigger_ref.current?.contains(t)) return;
      set_open(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <span
        ref={(el) => {
          trigger_ref.current = el?.querySelector("button") ?? null;
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => set_open((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          + Add condition
        </Button>
      </span>
      {open && (
        <div
          ref={menu_ref}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: Z.popover,
            background: "var(--color-surface-elevated)",
            border: "var(--border-thin) solid var(--color-border-subtle)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            minWidth: "220px",
            padding: "var(--space-1) 0",
          }}
          role="menu"
        >
          {/* KEEP RAW: condition-picker dropdown menu rows (role="menuitem"), not the standard Button taxonomy. */}
          {available.map((kind) => (
            <button
              key={kind}
              type="button"
              role="menuitem"
              onClick={() => handlePick(kind)}
              style={MENU_ITEM_STYLE}
              title={CONDITION_DESCRIPTIONS[kind]}
            >
              <div style={{ fontWeight: "var(--font-weight-medium)" }}>
                {CONDITION_LABELS[kind]}
              </div>
              {CONDITION_DESCRIPTIONS[kind] && (
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-tertiary)",
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
                borderTop: "1px solid var(--color-border)",
                marginTop: "var(--space-1)",
              }}
            >
              <div style={{ fontWeight: "var(--font-weight-medium)" }}>+ Add "any of" group</div>
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-tertiary)",
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
                padding: "var(--space-2) var(--space-3)",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-tertiary)",
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
  padding: "var(--space-2) var(--space-3)",
  background: "transparent",
  border: "none",
  textAlign: "left",
  cursor: "pointer",
  fontSize: "var(--font-size-sm)",
  color: "var(--color-text-primary)",
};
