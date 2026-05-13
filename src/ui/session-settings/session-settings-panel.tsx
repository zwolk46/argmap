import type { ReactElement } from "react";
import {
  Drawer,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  IconButton,
  Button,
} from "../primitives";
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
      width="420px"
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
          <svg
            width={14}
            height={14}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
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
        <Button
          variant="secondary"
          data-testid="session-settings-done"
          onClick={props.on_close}
        >
          Done
        </Button>
      </DrawerFooter>
    </Drawer>
  );
}
