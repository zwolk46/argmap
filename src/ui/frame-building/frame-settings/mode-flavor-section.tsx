import type { ReactElement } from "react";
import { useFrameStore } from "@/state";
import { Button } from "../../primitives";

export interface ModeFlavorSectionProps {
  on_open_mode_change_dialog?: (target: "mode" | "flavor") => void;
}

const VALUE_STYLE: React.CSSProperties = {
  fontSize: "var(--font-size-sm)",
  color: "var(--color-text-primary)",
  fontWeight: "var(--font-weight-medium)",
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <h3
          className="argmap-section-heading"
          style={{ display: "block", marginBottom: "var(--space-1)" }}
        >
          Mode
        </h3>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={VALUE_STYLE}>{mode_label}</span>
          <Button
            variant="secondary"
            size="sm"
            disabled={!can_change}
            title={can_change ? undefined : disabled_title}
            onClick={() => on_open_mode_change_dialog?.("mode")}
          >
            Change mode
          </Button>
        </div>
      </div>

      <div>
        <h3
          className="argmap-section-heading"
          style={{ display: "block", marginBottom: "var(--space-1)" }}
        >
          Flavor
        </h3>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={VALUE_STYLE}>{flavor_label}</span>
          <Button
            variant="secondary"
            size="sm"
            disabled={!can_change || flavor_disabled}
            title={
              !can_change ? disabled_title : flavor_disabled ? flavor_disabled_title : undefined
            }
            onClick={() => {
              if (flavor_disabled) return;
              on_open_mode_change_dialog?.("flavor");
            }}
          >
            Change flavor
          </Button>
        </div>
      </div>
    </div>
  );
}
