import * as React from "react";
import type { ReactElement } from "react";
import type { FrameId } from "@/schema";
import { useFrameStore, useAppStateStore, useRepository } from "@/state";
import { useNavigate } from "@/ui";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#components/ui/alert-dialog";
import { cn } from "#lib/utils";

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
    <div className="flex flex-col">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Frame actions
      </h3>

      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-foreground">Pin frame</span>
        {/* KEEP RAW: pill-toggle with active/inactive visual states, not the standard Button taxonomy. */}
        <button
          type="button"
          onClick={handlePinToggle}
          className={cn(
            "cursor-pointer rounded-md border px-3 py-1 text-xs",
            is_pinned
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-transparent text-muted-foreground hover:bg-muted",
          )}
        >
          {is_pinned ? "Pinned" : "Pin"}
        </button>
      </div>

      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-foreground">Archive</span>
        {/* KEEP RAW: pill-toggle with active/inactive visual states, not the standard Button taxonomy. */}
        <button
          type="button"
          onClick={handleArchiveToggle}
          className={cn(
            "cursor-pointer rounded-md border px-3 py-1 text-xs",
            is_archived
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-transparent text-muted-foreground hover:bg-muted",
          )}
        >
          {is_archived ? "Archived" : "Archive"}
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm text-destructive">Delete frame</span>
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
          shared AlertDialog primitive plus a type-to-confirm field.
          Ride-along P0-23 fix: confirm_disabled gates the action so Delete
          cannot fire on empty input. */}
      <AlertDialog
        open={delete_open}
        onOpenChange={(next) => {
          if (!next) {
            setDeleteOpen(false);
            setConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete frame &quot;{frame.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div data-testid="delete-frame-confirm-body">
                <p>
                  Deleting this frame, all its versions, and any sessions running against it cannot
                  be undone.
                </p>
                <label className="mt-2 block">
                  Type the frame title to confirm:
                  <Input
                    data-testid="delete-frame-confirm-input"
                    type="text"
                    value={confirm_text}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="mt-1"
                  />
                </label>
                {confirm_text.length > 0 && confirm_text !== frame.title ? (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    Type the title exactly to enable Delete.
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteOpen(false);
                setConfirmText("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={confirm_text !== frame.title}
              onClick={() => void handleDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
