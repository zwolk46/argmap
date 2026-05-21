import * as React from "react";
import type { ReactElement } from "react";
import { useSessionStore, useRepository } from "@/state";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";
import { Separator } from "#components/ui/separator";
import { ConfirmDialog } from "../primitives";
import { useOptionalToast } from "../primitives/toast";

// §9 #30. Auto-generated session titles include the parent frame title, which
// can be up to 200 chars; injecting that whole string into the dialog header
// overflows the modal. Truncate with an ellipsis for display only — the
// type-to-confirm comparison still uses the full title.
function truncateForHeader(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

export interface ArchiveDeleteSectionProps {
  on_delete_session: () => void;
}

export function ArchiveDeleteSection(props: ArchiveDeleteSectionProps): ReactElement {
  const archived = useSessionStore((s) => s.session?.archived ?? false);
  const title = useSessionStore((s) => s.session?.title ?? "");
  const { session_store } = useRepository();
  const toast = useOptionalToast();
  const [delete_open, setDeleteOpen] = React.useState(false);
  const [confirm_text, setConfirmText] = React.useState("");
  const confirm_input_id = React.useId();

  function toggleArchive(): void {
    const next_archived = !archived;
    session_store
      .getState()
      .applyPatch({ kind: "session_metadata_edited", partial: { archived: next_archived } });
    // §9 #33: surface a toast so the action lands somewhere visible —
    // the button label flip alone is silent feedback that cross-tab
    // observers won't see.
    toast?.push({
      kind: "info",
      message: next_archived ? "Session archived." : "Session unarchived.",
    });
  }

  const confirm_matches =
    confirm_text.trim().length > 0 &&
    confirm_text.trim().toLowerCase() === title.trim().toLowerCase();

  function handleDelete(): void {
    if (!confirm_matches) return;
    setDeleteOpen(false);
    setConfirmText("");
    props.on_delete_session();
  }

  return (
    <section data-testid="archive-delete-section" className="mt-6 pt-4">
      <Separator className="mb-4" />
      <header className="mb-2 text-sm font-medium">Archive and Delete</header>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          data-testid="archive-toggle"
          onClick={toggleArchive}
          title="Archived sessions are hidden from the default open-existing-session list"
        >
          {archived ? "Unarchive" : "Archive"}
        </Button>
        <Button
          variant="destructive"
          data-testid="delete-session-button"
          onClick={() => setDeleteOpen(true)}
        >
          Delete session
        </Button>
      </div>
      <ConfirmDialog
        open={delete_open}
        // §9 #30: cap the interpolated title so an auto-generated 200-char
        // session title (e.g. "Argument session — <long frame title>") doesn't
        // overflow the dialog header. Type-to-confirm input still uses the
        // full title for comparison; only the display label is truncated.
        title={`Delete session "${truncateForHeader(title, 60)}"?`}
        confirm_label="Delete"
        cancel_label="Cancel"
        confirm_variant="danger"
        // P0-23 ride-along: gate the confirm button on a matching typed title
        // so the dialog cannot silently no-op on empty / wrong input.
        confirm_disabled={!confirm_matches}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteOpen(false);
          setConfirmText("");
        }}
      >
        <div data-testid="delete-confirm-body">
          <p>Deleting this session and all its versions cannot be undone.</p>
          <div className="mt-2">
            <Label htmlFor={confirm_input_id} className="text-sm font-normal">
              Type the session title to confirm:
            </Label>
            <Input
              id={confirm_input_id}
              data-testid="delete-confirm-input"
              type="text"
              value={confirm_text}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-1"
            />
          </div>
          {confirm_text.length > 0 && !confirm_matches ? (
            <p className="mt-1 text-xs text-[var(--color-severity-warning)]">
              Type the title (case- and whitespace-insensitive) to enable Delete.
            </p>
          ) : null}
        </div>
      </ConfirmDialog>
    </section>
  );
}
