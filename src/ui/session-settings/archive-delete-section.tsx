import * as React from "react";
import type { ReactElement } from "react";
import { useSessionStore, useRepository } from "@/state";
import { ConfirmDialog } from "../primitives";

export interface ArchiveDeleteSectionProps {
  on_delete_session: () => void;
}

export function ArchiveDeleteSection(props: ArchiveDeleteSectionProps): ReactElement {
  const archived = useSessionStore((s) => s.session?.archived ?? false);
  const title = useSessionStore((s) => s.session?.title ?? "");
  const { session_store } = useRepository();
  const [delete_open, setDeleteOpen] = React.useState(false);
  const [confirm_text, setConfirmText] = React.useState("");

  function toggleArchive(): void {
    session_store
      .getState()
      .applyPatch({ kind: "session_metadata_edited", partial: { archived: !archived } });
  }

  function handleDelete(): void {
    if (confirm_text !== title) return;
    setDeleteOpen(false);
    setConfirmText("");
    props.on_delete_session();
  }

  return (
    <section
      data-testid="archive-delete-section"
      style={{
        marginTop: "var(--space-6, 24px)",
        paddingTop: "var(--space-4, 16px)",
        borderTop: "var(--border-hairline, 1px) solid var(--color-border-subtle, #e5e7eb)",
      }}
    >
      <header
        style={{
          fontSize: "var(--font-size-sm, 13px)",
          fontWeight: 500,
          marginBottom: "var(--space-2, 8px)",
        }}
      >
        Archive and Delete
      </header>
      <button
        type="button"
        data-testid="archive-toggle"
        onClick={toggleArchive}
        title="Archived sessions are hidden from the default open-existing-session list"
        style={{
          marginRight: "var(--space-2, 8px)",
          padding: "var(--space-1, 4px) var(--space-3, 12px)",
          fontSize: "var(--font-size-sm, 13px)",
        }}
      >
        {archived ? "Unarchive" : "Archive"}
      </button>
      <button
        type="button"
        data-testid="delete-session-button"
        onClick={() => setDeleteOpen(true)}
        style={{
          padding: "var(--space-1, 4px) var(--space-3, 12px)",
          fontSize: "var(--font-size-sm, 13px)",
          color: "var(--color-severity-error, #dc2626)",
          background: "transparent",
          border: "var(--border-thin, 1px) solid var(--color-severity-error, #dc2626)",
          borderRadius: "var(--radius-md, 6px)",
          cursor: "pointer",
        }}
      >
        Delete session
      </button>
      <ConfirmDialog
        open={delete_open}
        title={`Delete session "${title}"?`}
        confirm_label="Delete"
        cancel_label="Cancel"
        confirm_variant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteOpen(false);
          setConfirmText("");
        }}
      >
        <div data-testid="delete-confirm-body">
          <p>Deleting this session and all its versions cannot be undone.</p>
          <label style={{ display: "block", marginTop: "var(--space-2, 8px)" }}>
            Type the session title to confirm:
            <input
              data-testid="delete-confirm-input"
              type="text"
              value={confirm_text}
              onChange={(e) => setConfirmText(e.target.value)}
              style={{
                width: "100%",
                padding: "var(--space-1, 4px) var(--space-2, 8px)",
                marginTop: "var(--space-1, 4px)",
              }}
            />
          </label>
        </div>
      </ConfirmDialog>
    </section>
  );
}
