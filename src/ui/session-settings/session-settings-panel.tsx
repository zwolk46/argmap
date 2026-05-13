import type { ReactElement } from "react";
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter } from "../primitives";
import { MetadataSection } from "./metadata-section";
import { G6RemoveRewriteSection } from "./g6-remove-rewrite-section";
import { G12AdvisoryToggleSection } from "./g12-advisory-toggle-section";
import { ArchiveDeleteSection } from "./archive-delete-section";

export interface SessionSettingsPanelProps {
  open: boolean;
  on_close: () => void;
  on_open_frame_settings: () => void;
  on_delete_session: () => void;
}

export function SessionSettingsPanel(props: SessionSettingsPanelProps): ReactElement | null {
  if (!props.open) return null;
  return (
    <Drawer open={props.open} onClose={props.on_close} width="420px">
      <DrawerHeader>
        <span data-testid="session-settings-title">Session settings</span>
        <button
          type="button"
          data-testid="session-settings-close"
          onClick={props.on_close}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            color: "var(--color-text-secondary, #6b7280)",
          }}
        >
          ×
        </button>
      </DrawerHeader>
      <DrawerBody>
        <MetadataSection />
        <G6RemoveRewriteSection />
        <G12AdvisoryToggleSection on_open_frame_settings={props.on_open_frame_settings} />
        <ArchiveDeleteSection on_delete_session={props.on_delete_session} />
      </DrawerBody>
      <DrawerFooter>
        <button type="button" data-testid="session-settings-done" onClick={props.on_close}>
          Done
        </button>
      </DrawerFooter>
    </Drawer>
  );
}
