import type { ReactElement } from "react";
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter, IconButton, Button } from "../primitives";
import { UIcon } from "../primitives/uicon";
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
    <Drawer
      open={props.open}
      onClose={props.on_close}
      width="min(420px, 100vw)"
      aria_label="Session settings"
    >
      <DrawerHeader>
        <span data-testid="session-settings-title">Session settings</span>
        <IconButton
          size="sm"
          data-testid="session-settings-close"
          aria-label="Close session settings"
          onClick={props.on_close}
        >
          <UIcon name="times" size={14} />
        </IconButton>
      </DrawerHeader>
      <DrawerBody>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <MetadataSection />
          <G6RemoveRewriteSection />
          <G12AdvisoryToggleSection on_open_frame_settings={props.on_open_frame_settings} />
          <ArchiveDeleteSection on_delete_session={props.on_delete_session} />
        </div>
      </DrawerBody>
      <DrawerFooter>
        <Button variant="secondary" data-testid="session-settings-done" onClick={props.on_close}>
          Done
        </Button>
      </DrawerFooter>
    </Drawer>
  );
}
