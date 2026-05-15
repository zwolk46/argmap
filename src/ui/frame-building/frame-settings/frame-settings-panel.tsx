import type { ReactElement } from "react";
import { useFrameStore } from "@/state";
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter, IconButton, Button } from "../../primitives";
import { UIcon } from "../../primitives/uicon";
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

const SECTION_DIVIDER_STYLE: React.CSSProperties = {
  borderTop: "var(--border-hairline) solid var(--color-border-subtle)",
  marginTop: "var(--space-5)",
  paddingTop: "var(--space-5)",
};

export function FrameSettingsPanel({
  open,
  on_close,
  on_open_mode_change_dialog,
}: FrameSettingsPanelProps): ReactElement {
  const mode = useFrameStore((s) => s.frame?.mode);

  return (
    <Drawer open={open} onClose={on_close} width="420px" aria_label="Frame settings">
      <DrawerHeader>
        <span>Frame settings</span>
        <IconButton aria-label="Close frame settings" onClick={on_close} size="sm">
          <UIcon name="times" size={14} />
        </IconButton>
      </DrawerHeader>

      <DrawerBody>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {/* Metadata */}
          <MetadataSection />

          {/* Mode & Flavor */}
          <div style={SECTION_DIVIDER_STYLE}>
            <ModeFlavorSection on_open_mode_change_dialog={on_open_mode_change_dialog} />
          </div>

          {/* Jurisdiction (legal mode only) */}
          {mode === "legal" && (
            <div style={SECTION_DIVIDER_STYLE}>
              <JurisdictionSection />
            </div>
          )}

          {/* Positions (general mode only) */}
          {mode === "general" && (
            <div style={SECTION_DIVIDER_STYLE}>
              <PositionsSection />
            </div>
          )}

          {/* Default policies */}
          <div style={SECTION_DIVIDER_STYLE}>
            <DefaultPoliciesSection />
          </div>

          {/* Pin / Archive / Delete */}
          <div style={SECTION_DIVIDER_STYLE}>
            <PinArchiveDeleteSection />
          </div>
        </div>
      </DrawerBody>
      <DrawerFooter>
        <Button variant="secondary" data-testid="frame-settings-done" onClick={on_close}>
          Done
        </Button>
      </DrawerFooter>
    </Drawer>
  );
}
