import type { ReactElement } from "react";
import { useFrameStore } from "@/state";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "#components/ui/sheet";
import { Button } from "#components/ui/button";
import { Separator } from "#components/ui/separator";
import { MetadataSection } from "./metadata-section";
import { ModeFlavorSection } from "./mode-flavor-section";
import { JurisdictionSection } from "./jurisdiction-section";
import { PositionsSection } from "./positions-section";
import { DefaultPoliciesSection } from "./default-policies-section";
import { PinArchiveDeleteSection } from "./pin-archive-delete-section";

export interface FrameSettingsPanelProps {
  open: boolean;
  on_close: () => void;
  on_open_mode_change_dialog?: (target: "mode" | "flavor") => void;
  on_delete_frame?: () => void;
}

export function FrameSettingsPanel({
  open,
  on_close,
  on_open_mode_change_dialog,
}: FrameSettingsPanelProps): ReactElement {
  const mode = useFrameStore((s) => s.frame?.mode);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) on_close();
      }}
    >
      <SheetContent
        side="right"
        aria-label="Frame settings"
        className="flex w-full max-w-sm flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="p-4">
          <SheetTitle>Frame settings</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-4">
          <div className="flex flex-col gap-5">
            {/* Metadata */}
            <MetadataSection />

            {/* Mode & Flavor */}
            <Separator />
            <ModeFlavorSection on_open_mode_change_dialog={on_open_mode_change_dialog} />

            {/* Jurisdiction (legal mode only) */}
            {mode === "legal" && (
              <>
                <Separator />
                <JurisdictionSection />
              </>
            )}

            {/* Positions (general mode only) */}
            {mode === "general" && (
              <>
                <Separator />
                <PositionsSection />
              </>
            )}

            {/* Default policies */}
            <Separator />
            <DefaultPoliciesSection />

            {/* Pin / Archive / Delete */}
            <Separator />
            <PinArchiveDeleteSection />
          </div>
        </div>

        <SheetFooter className="p-4">
          <Button variant="outline" data-testid="frame-settings-done" onClick={on_close}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
