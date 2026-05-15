import * as React from "react";
import type { ReactElement } from "react";
import type { FrameId } from "@/schema";
import { useFrameStore, useAppStateStore, useRepository } from "@/state";
import { useNavigate } from "@/ui";
import { Button, ConfirmDialog } from "../../primitives";

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

  const [delete_open, setDeleteOpen] = React.useState(false);
  const [confirm_text, setConfirmText] = React.useState("");

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
    if (confirm_text !== frame!.title) return;
    setDeleteOpen(false);
    setConfirmText("");
    await app_state_store.getState().deleteFrame(frame_id!);
    navigate({ kind: "home" });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <h3
        className="argmap-section-heading"
        style={{ display: "block", marginBottom: "var(--space-2, 8px)" }}
      >
        Frame actions
      </h3>

      <div style={ROW_STYLE}>
        <span style={ROW_LABEL_STYLE}>Pin frame</span>
        {/* KEEP RAW: pill-toggle with active/inactive visual states, not the standard Button taxonomy. */}
        <button type="button" style={TOGGLE_BTN_STYLE(is_pinned)} onClick={handlePinToggle}>
          {is_pinned ? "Pinned" : "Pin"}
        </button>
      </div>

      <div style={ROW_STYLE}>
        <span style={ROW_LABEL_STYLE}>Archive</span>
        {/* KEEP RAW: pill-toggle with active/inactive visual states, not the standard Button taxonomy. */}
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
        <Button
          variant="destructive"
          size="sm"
          data-testid="delete-frame-button"
          onClick={() => setDeleteOpen(true)}
        >
          Delete
        </Button>
      </div>

      {/* P0-21: replaced native window.confirm() — no type-to-confirm, no
          destructive styling, no consistency with session-delete — with the
          shared ConfirmDialog primitive plus a type-to-confirm field.
          Ride-along P0-23 fix: confirm_disabled gates the action so Delete
          cannot fire on empty input. */}
      <ConfirmDialog
        open={delete_open}
        title={`Delete frame "${frame.title}"?`}
        confirm_label="Delete"
        cancel_label="Cancel"
        confirm_variant="danger"
        confirm_disabled={confirm_text !== frame.title}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          setDeleteOpen(false);
          setConfirmText("");
        }}
      >
        <div data-testid="delete-frame-confirm-body">
          <p>
            Deleting this frame, all its versions, and any sessions running against it cannot be
            undone.
          </p>
          <label style={{ display: "block", marginTop: "var(--space-2, 8px)" }}>
            Type the frame title to confirm:
            <input
              data-testid="delete-frame-confirm-input"
              type="text"
              value={confirm_text}
              onChange={(e) => setConfirmText(e.target.value)}
              className="argmap-input"
              style={{
                marginTop: "var(--space-1, 4px)",
              }}
            />
          </label>
          {confirm_text.length > 0 && confirm_text !== frame.title ? (
            <p
              style={{
                marginTop: "var(--space-1, 4px)",
                color: "var(--color-severity-warning, #d97706)",
                fontSize: "var(--font-size-xs, 11px)",
              }}
            >
              Type the title exactly to enable Delete.
            </p>
          ) : null}
        </div>
      </ConfirmDialog>
    </div>
  );
}
