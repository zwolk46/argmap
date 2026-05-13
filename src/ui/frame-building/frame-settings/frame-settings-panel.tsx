import type { ReactElement } from "react";
import { useFrameStore } from "@/state";
import { Drawer, DrawerHeader, DrawerBody } from "../../primitives";
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
  borderTop: "1px solid var(--color-border-subtle, #f3f4f6)",
  marginTop: "var(--space-5, 20px)",
  paddingTop: "var(--space-5, 20px)",
};

export function FrameSettingsPanel({
  open,
  on_close,
  on_open_mode_change_dialog,
}: FrameSettingsPanelProps): ReactElement {
  const mode = useFrameStore((s) => s.frame?.mode);

  return (
    <Drawer open={open} onClose={on_close} width="400px">
      <DrawerHeader>
        <span>Frame settings</span>
        <button
          type="button"
          onClick={on_close}
          aria-label="Close frame settings"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "var(--font-size-md, 14px)",
            color: "var(--color-text-tertiary, #9ca3af)",
            padding: "var(--space-1, 4px)",
          }}
        >
          ✕
        </button>
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
    </Drawer>
  );
}
