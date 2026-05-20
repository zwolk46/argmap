import type { ReactElement } from "react";
import { useFrameStore } from "@/state";
import { Button } from "#components/ui/button";

export interface ModeFlavorSectionProps {
  on_open_mode_change_dialog?: (target: "mode" | "flavor") => void;
}

export function ModeFlavorSection({
  on_open_mode_change_dialog,
}: ModeFlavorSectionProps): ReactElement | null {
  const frame = useFrameStore((s) => s.frame);

  if (!frame) return null;

  const mode_label = frame.mode === "legal" ? "Legal" : "General";
  const flavor_label =
    frame.mode === "legal" ? "—" : frame.flavor === "academic" ? "Academic" : "Personal";

  const can_change = on_open_mode_change_dialog !== undefined;
  // M9: drop the internal milestone reference. "Coming in I.9d" doesn't
  // mean anything to the user.
  const disabled_title = "Mode change coming soon";
  // P1: in legal mode, flavor doesn't apply (the flavor-change dialog
  // returns null for legal frames). Disabling the button explicitly here
  // — rather than letting the user click and see a flicker — communicates
  // the constraint up-front.
  const flavor_disabled = frame.mode === "legal";
  const flavor_disabled_title = flavor_disabled
    ? "Flavor applies only in general mode. Change the mode first."
    : disabled_title;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mode</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{mode_label}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!can_change}
            title={can_change ? undefined : disabled_title}
            onClick={() => on_open_mode_change_dialog?.("mode")}
          >
            Change mode
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Flavor
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{flavor_label}</span>
          <Button
            variant="outline"
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
