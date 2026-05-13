import type { ReactElement } from "react";
import { useFrameStore } from "@/state";

export interface ModeFlavorSectionProps {
  on_open_mode_change_dialog?: (target: "mode" | "flavor") => void;
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: "var(--font-size-xs, 11px)",
  fontWeight: 600,
  color: "var(--color-text-tertiary, #9ca3af)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  display: "block",
  marginBottom: "var(--space-1, 4px)",
};

const VALUE_STYLE: React.CSSProperties = {
  fontSize: "var(--font-size-sm, 13px)",
  color: "var(--color-text-primary, #111827)",
  fontWeight: 500,
};

const CHANGE_BTN_STYLE: React.CSSProperties = {
  padding: "var(--space-1, 4px) var(--space-3, 12px)",
  fontSize: "var(--font-size-xs, 11px)",
  border: "1px solid var(--color-border-default, #e5e7eb)",
  borderRadius: "var(--radius-sm, 4px)",
  cursor: "pointer",
  background: "var(--color-surface-pane, #f9fafb)",
  color: "var(--color-text-secondary, #6b7280)",
};

const DISABLED_BTN_STYLE: React.CSSProperties = {
  ...CHANGE_BTN_STYLE,
  cursor: "not-allowed",
  opacity: 0.5,
};

export function ModeFlavorSection({
  on_open_mode_change_dialog,
}: ModeFlavorSectionProps): ReactElement | null {
  const frame = useFrameStore((s) => s.frame);

  if (!frame) return null;

  const mode_label = frame.mode === "legal" ? "Legal" : "General";
  const flavor_label =
    frame.mode === "legal" ? "—" : frame.flavor === "academic" ? "Academic" : "Personal";

  const can_change = on_open_mode_change_dialog !== undefined;
  const disabled_title = "Coming in I.9d";
  // P1: in legal mode, flavor doesn't apply (the flavor-change dialog
  // returns null for legal frames). Disabling the button explicitly here
  // — rather than letting the user click and see a flicker — communicates
  // the constraint up-front.
  const flavor_disabled = frame.mode === "legal";
  const flavor_disabled_title = flavor_disabled
    ? "Flavor applies only in general mode. Change the mode first."
    : disabled_title;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4, 16px)" }}>
      <div>
        <span style={LABEL_STYLE}>Mode</span>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={VALUE_STYLE}>{mode_label}</span>
          <button
            type="button"
            style={can_change ? CHANGE_BTN_STYLE : DISABLED_BTN_STYLE}
            disabled={!can_change}
            title={can_change ? undefined : disabled_title}
            onClick={() => on_open_mode_change_dialog?.("mode")}
          >
            Change mode
          </button>
        </div>
      </div>

      <div>
        <span style={LABEL_STYLE}>Flavor</span>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={VALUE_STYLE}>{flavor_label}</span>
          <button
            type="button"
            style={can_change && !flavor_disabled ? CHANGE_BTN_STYLE : DISABLED_BTN_STYLE}
            disabled={!can_change || flavor_disabled}
            title={!can_change ? disabled_title : flavor_disabled ? flavor_disabled_title : undefined}
            onClick={() => {
              if (flavor_disabled) return;
              on_open_mode_change_dialog?.("flavor");
            }}
          >
            Change flavor
          </button>
        </div>
      </div>
    </div>
  );
}
