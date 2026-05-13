import * as React from "react";
import type { ReactElement } from "react";
import type { FrameVersionId } from "@/schema";
import type { OrphanResolution } from "@/state";
import { useRepository } from "@/state";
import { Dialog, DialogHeader, DialogBody, DialogFooter, Button } from "../primitives";
import { MigrationDialogBody, type MigrationBodyPhase } from "./migration-dialog-body";
import { usePreviewMigration } from "./use-preview-migration";

export interface SessionMigrationDialogProps {
  open: boolean;
  onClose: () => void;
  target_frame_version_id: FrameVersionId;
}

export function SessionMigrationDialog(
  props: SessionMigrationDialogProps,
): ReactElement | null {
  const { open, onClose, target_frame_version_id } = props;
  const { session_store } = useRepository();

  const preview = usePreviewMigration({
    target_frame_version_id,
    enabled: open,
  });

  const [resolutions, setResolutions] = React.useState<Map<string, OrphanResolution>>(
    new Map(),
  );
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
    } catch (e: unknown) {
      const err = e as { kind?: string; message?: string };
      setMigrating(false);
      setMigrateError({ kind: err.kind ?? "error", message: err.message ?? String(e) });
    }
  }

  const can_migrate =
    !migrating && (phase.kind === "loaded" || phase.kind === "loaded_empty");

  return (
    <Dialog open={true} onClose={onClose} aria_label="Migrate session" size="md">
      <DialogHeader>Migrate session</DialogHeader>
      <DialogBody>
        <MigrationDialogBody
          phase={phase}
          onResolutionChanged={onResolutionChanged}
          onRetry={preview.retry}
        />
        {migrate_error ? (
          <div
            data-testid="migrate-error"
            style={{
              color: "var(--color-severity-error)",
              background: "var(--color-severity-error-bg)",
              padding: "var(--space-3) var(--space-4)",
              fontSize: "var(--font-size-sm)",
              borderRadius: "var(--radius-md)",
              borderLeft: "var(--border-thick) solid var(--color-severity-error)",
              marginTop: "var(--space-3)",
            }}
          >
            {migrate_error.message}
          </div>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" data-testid="migration-cancel" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          data-testid="migration-commit"
          disabled={!can_migrate}
          onClick={handleMigrate}
        >
          Migrate
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
