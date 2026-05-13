import type { ReactElement } from "react";
import type { FrameId } from "@/schema";
import { useFrameStore, useAppStateStore, useRepository } from "@/state";
import { useNavigate } from "@/ui";

const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontSize: "var(--font-size-xs, 11px)",
  fontWeight: 600,
  color: "var(--color-text-tertiary, #9ca3af)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  display: "block",
  marginBottom: "var(--space-2, 8px)",
};

const ROW_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "var(--space-2, 8px) 0",
};

const ROW_LABEL_STYLE: React.CSSProperties = {
  fontSize: "var(--font-size-sm, 13px)",
  color: "var(--color-text-primary, #111827)",
};

const TOGGLE_BTN_STYLE = (active: boolean): React.CSSProperties => ({
  padding: "var(--space-1, 4px) var(--space-3, 12px)",
  fontSize: "var(--font-size-xs, 11px)",
  border: active
    ? "1px solid var(--color-mode-current-accent, #6366f1)"
    : "1px solid var(--color-border-default, #e5e7eb)",
  borderRadius: "var(--radius-sm, 4px)",
  cursor: "pointer",
  background: active ? "var(--color-mode-current-accent, #6366f1)" : "transparent",
  color: active ? "var(--color-text-on-accent, #fff)" : "var(--color-text-secondary, #6b7280)",
});

export function PinArchiveDeleteSection(): ReactElement | null {
  const frame = useFrameStore((s) => s.frame);
  const frame_id = frame?.id as FrameId | undefined;

  const is_pinned = useAppStateStore((s) =>
    frame_id ? s.app_state.pinned.includes(frame_id) : false,
  );
  const is_archived = frame?.archived ?? false;

  const { frame_store, app_state_store } = useRepository();
  const navigate = useNavigate();

  if (!frame || !frame_id) return null;

  function handlePinToggle() {
    app_state_store.getState().pinFrame(frame_id!, !is_pinned);
  }

  function handleArchiveToggle() {
    frame_store.getState().applyPatch({
      kind: "metadata_edited",
      partial: { archived: !is_archived },
    });
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete the frame "${frame!.title}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    await app_state_store.getState().deleteFrame(frame_id!);
    navigate({ kind: "home" });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={SECTION_LABEL_STYLE}>Frame actions</span>

      <div style={ROW_STYLE}>
        <span style={ROW_LABEL_STYLE}>Pin frame</span>
        <button type="button" style={TOGGLE_BTN_STYLE(is_pinned)} onClick={handlePinToggle}>
          {is_pinned ? "Pinned" : "Pin"}
        </button>
      </div>

      <div style={ROW_STYLE}>
        <span style={ROW_LABEL_STYLE}>Archive</span>
        <button type="button" style={TOGGLE_BTN_STYLE(is_archived)} onClick={handleArchiveToggle}>
          {is_archived ? "Archived" : "Archive"}
        </button>
      </div>

      <div
        style={{
          ...ROW_STYLE,
          borderTop: "1px solid var(--color-border-subtle, #f3f4f6)",
          marginTop: "var(--space-2, 8px)",
          paddingTop: "var(--space-3, 12px)",
        }}
      >
        <span style={{ ...ROW_LABEL_STYLE, color: "var(--color-severity-error, #ef4444)" }}>
          Delete frame
        </span>
        <button
          type="button"
          onClick={() => void handleDelete()}
          style={{
            padding: "var(--space-1, 4px) var(--space-3, 12px)",
            fontSize: "var(--font-size-xs, 11px)",
            border: "1px solid var(--color-severity-error, #ef4444)",
            borderRadius: "var(--radius-sm, 4px)",
            cursor: "pointer",
            background: "transparent",
            color: "var(--color-severity-error, #ef4444)",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
