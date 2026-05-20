import * as React from "react";
import type { ReactElement } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import type { FrameId, FrameVersionId, SessionVersionId } from "@/schema";
import { useRepository } from "@/state";
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
import { useOptionalToast } from "../primitives";

export interface RestoreConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  entity_kind: "frame" | "session";
  ancestor_version_id: FrameVersionId | SessionVersionId;
  ancestor_version_number: number;
  current_version_number: number;
  /**
   * §8 #2: parent frame id, supplied only when `entity_kind === "frame"`. The
   * dialog fetches `listSessionsForFrame(frame_id)` so it can disclose how
   * many active argument sessions are anchored to this frame and will
   * effectively go off-path once the restore creates a new head. Optional
   * because session restores don't strand anything and don't need the
   * advisory.
   */
  frame_id?: FrameId;
  on_restored: () => void;
}

export function RestoreConfirmDialog(props: RestoreConfirmDialogProps): ReactElement | null {
  const {
    open,
    onClose,
    entity_kind,
    ancestor_version_id,
    ancestor_version_number,
    current_version_number,
    frame_id,
    on_restored,
  } = props;
  const { frame_store, session_store, repository } = useRepository();
  const toast = useOptionalToast();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // §8 #2: count of non-archived sessions anchored to this frame, fetched
  // when the dialog opens for a frame restore. `null` = not yet fetched or
  // not applicable (session restore); `number` = fetched count.
  const [affected_sessions, setAffectedSessions] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) {
      setPending(false);
      setError(null);
      setAffectedSessions(null);
    }
  }, [open]);

  // §8 #2: fetch the affected session count whenever the dialog opens for a
  // frame restore. listSessionsForFrame already excludes archived rows in
  // both repos, so the count reflects live sessions only.
  React.useEffect(() => {
    if (!open) return;
    if (entity_kind !== "frame" || !frame_id) {
      setAffectedSessions(null);
      return;
    }
    let cancelled = false;
    void repository
      .listSessionsForFrame(frame_id)
      .then((summaries) => {
        if (!cancelled) setAffectedSessions(summaries.length);
      })
      .catch(() => {
        // Failure here only suppresses the advisory; it must not block the
        // restore itself. A toast or error UI would be misleading because
        // the user hasn't done anything yet.
        if (!cancelled) setAffectedSessions(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, entity_kind, frame_id, repository]);

  async function handleConfirm(e: React.MouseEvent<HTMLButtonElement>): Promise<void> {
    // Prevent the AlertDialogAction's default close-on-click so we can run
    // the async restore first and close manually on success.
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (entity_kind === "frame") {
        await frame_store.getState().restoreVersion(ancestor_version_id as FrameVersionId);
      } else {
        await session_store.getState().restoreVersion(ancestor_version_id as SessionVersionId);
      }
      setPending(false);
      // §8 #8: confirm the restore happened. Previously the dialog and pane
      // both closed with no feedback and the user wasn't sure whether
      // anything had occurred.
      toast?.push({
        kind: "success",
        message: `Restored v${ancestor_version_number} — now editing v${current_version_number + 1} forked from v${ancestor_version_number}.`,
      });
      on_restored();
      onClose();
    } catch (err: unknown) {
      setPending(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (!open) return null;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="inline-flex items-center gap-2">
            <ArrowCounterClockwise aria-hidden="true" />
            Restore version {ancestor_version_number}?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div data-testid="restore-confirm-body" className="text-sm">
              Restoring version {ancestor_version_number} will create a new version (v
              {current_version_number + 1}) that branches from version {ancestor_version_number}.
              The current version (v{current_version_number}) and any later versions remain on their
              own branch — they aren&apos;t overwritten or deleted.
              {entity_kind === "frame" && affected_sessions !== null && affected_sessions > 0 ? (
                <div
                  data-testid="restore-confirm-sessions-advisory"
                  className="mt-2 text-muted-foreground"
                >
                  {affected_sessions === 1
                    ? "1 argument session"
                    : `${affected_sessions} argument sessions`}{" "}
                  currently reference{affected_sessions === 1 ? "s" : ""} this frame. After
                  restoring, {affected_sessions === 1 ? "it stays" : "they stay"} anchored to{" "}
                  {affected_sessions === 1 ? "its" : "their"} existing frame version, which becomes
                  a side branch from the new head. You can migrate each session to the new head from
                  its Version history later.
                </div>
              ) : null}
              {error ? (
                <div
                  data-testid="restore-confirm-error"
                  className="mt-2"
                  style={{ color: "var(--color-severity-error)" }}
                >
                  {error}
                </div>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={pending}
            // §8 #9: restore is a state-changing action; use the destructive
            // tone so the button's visual weight matches its consequence.
            variant="destructive"
          >
            {pending ? "Restoring…" : "Restore"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
