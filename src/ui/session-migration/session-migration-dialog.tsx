import * as React from "react";
import type { ReactElement } from "react";
import type { FrameVersionId } from "@/schema";
import type { OrphanResolution } from "@/state";
import { useRepository, useSessionStore, useFrameStore } from "@/state";
import { Dialog, DialogHeader, DialogBody, DialogFooter, useToast } from "../primitives";
import { Button } from "#components/ui/button";
import { Alert } from "#components/ui/alert";
import { MigrationDialogBody, type MigrationBodyPhase } from "./migration-dialog-body";
import { usePreviewMigration } from "./use-preview-migration";

export interface SessionMigrationDialogProps {
  open: boolean;
  onClose: () => void;
  target_frame_version_id: FrameVersionId;
}

export function SessionMigrationDialog(props: SessionMigrationDialogProps): ReactElement | null {
  const { open, onClose, target_frame_version_id } = props;
  const { session_store } = useRepository();
  const toast = useToast();

  const preview = usePreviewMigration({
    target_frame_version_id,
    enabled: open,
  });

  // H7: surface version numbers so the user reads "v3 → v5" instead of just
  // "Migrate session". The session's frame_version_snapshot carries its own
  // version_number; the target's number comes from frame_store's current
  // frame_version when (as is typical) the target is the head.
  const session_version = useSessionStore(
    (s) => s.session?.frame_version_snapshot?.version_number ?? null,
  );
  const target_version = useFrameStore((s) =>
    s.frame_version?.id === target_frame_version_id ? s.frame_version.version_number : null,
  );

  const [resolutions, setResolutions] = React.useState<Map<string, OrphanResolution>>(new Map());
  const [migrating, setMigrating] = React.useState(false);
  const [migrate_error, setMigrateError] = React.useState<{
    kind: string;
    message: string;
  } | null>(null);

  // Seed resolutions from preview defaults whenever a new load completes.
  React.useEffect(() => {
    if (preview.phase.kind === "loaded") {
      setResolutions(new Map(preview.phase.defaults));
    }
    if (preview.phase.kind !== "loaded" && preview.phase.kind !== "failed") {
      setMigrateError(null);
    }
  }, [preview.phase]);

  if (!open) return null;

  const phase: MigrationBodyPhase =
    preview.phase.kind === "loading"
      ? { kind: "loading" }
      : preview.phase.kind === "failed"
        ? { kind: "failed", error: preview.phase.error }
        : preview.phase.kind === "loaded" && preview.phase.candidates.length === 0
          ? { kind: "loaded_empty" }
          : preview.phase.kind === "loaded"
            ? {
                kind: "loaded",
                candidates: preview.phase.candidates,
                resolutions,
              }
            : { kind: "loading" };

  function onResolutionChanged(carrier_id: string, resolution: OrphanResolution): void {
    setResolutions((prev) => {
      const next = new Map(prev);
      next.set(carrier_id, resolution);
      return next;
    });
  }

  async function handleMigrate(): Promise<void> {
    if (preview.phase.kind !== "loaded" && preview.phase.kind !== "idle") {
      // Allow migration when preview is loaded or empty.
    }
    setMigrating(true);
    setMigrateError(null);
    try {
      const ordered: OrphanResolution[] = [];
      if (preview.phase.kind === "loaded") {
        for (const c of preview.phase.candidates) {
          const r = resolutions.get(c.carrier_id);
          if (r) ordered.push(r);
        }
      }
      await session_store.getState().migrateToFrameVersion(target_frame_version_id, ordered);
      setMigrating(false);
      onClose();
      // P1: confirm the migration succeeded — previously the dialog just
      // closed and the user had to guess whether anything happened.
      toast.push({ kind: "success", message: "Session migrated to the new frame version." });
    } catch (e: unknown) {
      const err = e as { kind?: string; message?: string };
      setMigrating(false);
      setMigrateError({ kind: err.kind ?? "error", message: err.message ?? String(e) });
    }
  }

  const can_migrate = !migrating && (phase.kind === "loaded" || phase.kind === "loaded_empty");

  return (
    <Dialog
      open={true}
      onClose={onClose}
      aria_labelledby="session-migration-dialog-title"
      aria_label="Migrate session"
      size="md"
    >
      <DialogHeader id="session-migration-dialog-title">Migrate session</DialogHeader>
      <DialogBody>
        {(session_version !== null || target_version !== null) && (
          <div
            data-testid="migration-version-preamble"
            className="mb-3 text-sm text-muted-foreground"
          >
            Migrating session from frame{" "}
            <strong className="text-foreground">v{session_version ?? "?"}</strong> →{" "}
            <strong className="text-foreground">v{target_version ?? "?"}</strong>
          </div>
        )}
        <MigrationDialogBody
          phase={phase}
          onResolutionChanged={onResolutionChanged}
          onRetry={preview.retry}
        />
        {migrate_error ? (
          <Alert
            data-testid="migrate-error"
            variant="destructive"
            className="mt-3 px-4 py-3 text-sm"
          >
            {migrate_error.message}
          </Alert>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" data-testid="migration-cancel" onClick={onClose}>
          Cancel
        </Button>
        <Button data-testid="migration-commit" disabled={!can_migrate} onClick={handleMigrate}>
          Migrate
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
