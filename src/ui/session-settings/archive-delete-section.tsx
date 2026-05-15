import * as React from "react";
import type { ReactElement } from "react";
import { useSessionStore, useRepository } from "@/state";
import { Button, ConfirmDialog } from "../primitives";

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
        marginTop: "var(--space-6)",
        paddingTop: "var(--space-4)",
        borderTop: "var(--border-hairline) solid var(--color-border-subtle)",
      }}
    >
      <header
        style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-medium)",
          marginBottom: "var(--space-2)",
        }}
      >
        Archive and Delete
      </header>
      <Button
        variant="secondary"
        size="md"
        data-testid="archive-toggle"
        onClick={toggleArchive}
        title="Archived sessions are hidden from the default open-existing-session list"
        style={{ marginRight: "var(--space-2)" }}
      >
        {archived ? "Unarchive" : "Archive"}
      </Button>
      <Button
        variant="destructive"
        size="md"
        data-testid="delete-session-button"
        onClick={() => setDeleteOpen(true)}
      >
        Delete session
      </Button>
      <ConfirmDialog
        open={delete_open}
        title={`Delete session "${title}"?`}
        confirm_label="Delete"
        cancel_label="Cancel"
        confirm_variant="danger"
        // P0-23 ride-along: gate the confirm button on a matching typed title
        // so the dialog cannot silently no-op on empty / wrong input.
        confirm_disabled={confirm_text !== title}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteOpen(false);
          setConfirmText("");
        }}
      >
        <div data-testid="delete-confirm-body">
          <p>Deleting this session and all its versions cannot be undone.</p>
          <label style={{ display: "block", marginTop: "var(--space-2)" }}>
            Type the session title to confirm:
            <input
              data-testid="delete-confirm-input"
              type="text"
              value={confirm_text}
              onChange={(e) => setConfirmText(e.target.value)}
              className="argmap-input"
              style={{ marginTop: "var(--space-1)" }}
            />
          </label>
          {confirm_text.length > 0 && confirm_text !== title ? (
            <p
              style={{
                marginTop: "var(--space-1)",
                color: "var(--color-severity-warning)",
                fontSize: "var(--font-size-xs)",
              }}
            >
              Type the title exactly to enable Delete.
            </p>
          ) : null}
        </div>
      </ConfirmDialog>
    </section>
  );
}
