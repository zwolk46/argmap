import * as React from "react";
import type { ReactElement } from "react";
import { useSessionStore, useRepository } from "@/state";
import { Button } from "#components/ui/button";
import { ConfirmDialog } from "../primitives";

export function previewProse(text: string | undefined, max_len = 120): string {
  if (!text) return "";
  if (text.length <= max_len) return text;
  return text.slice(0, max_len) + "…";
}

export function G6RemoveRewriteSection(): ReactElement {
  const overrides = useSessionStore((s) => s.session_version?.output_overrides);
  const next_version_number =
    (useSessionStore((s) => s.session_version?.version_number ?? 0) as number) + 1;
  const { session_store } = useRepository();
  const [confirm_open, setConfirmOpen] = React.useState(false);

  const has_rewrite = !!overrides?.rewritten_prose;
  const preview_text = previewProse(overrides?.rewritten_prose);

  function handleConfirm(): void {
    session_store.getState().applyPatch({ kind: "output_overrides_cleared" });
    setConfirmOpen(false);
  }

  return (
    <section data-testid="g6-section" className="mb-3">
      <header className="mb-2 text-sm font-medium">Output rewrite (G6)</header>
      {!has_rewrite ? (
        <p data-testid="g6-empty-state" className="text-sm text-muted-foreground">
          {/* §9 #34: don't reference specific UI surfaces by name ("prose tab",
              "output viewer") — describe the feature instead. The rewrite is
              opt-in and visible only on sessions that have one, so saying
              there isn't one yet plus what it does is enough orientation. */}
          No AI-rewritten prose for this session. The G6 rewrite, when used, produces a polished
          version of the deterministic output and is shown alongside it; the canonical output never
          changes.
        </p>
      ) : (
        <>
          <p data-testid="g6-preview" className="text-sm italic text-foreground">
            {preview_text}
          </p>
          <Button
            variant="destructive"
            data-testid="g6-remove-button"
            onClick={() => setConfirmOpen(true)}
            className="mt-2"
          >
            Remove rewrite
          </Button>
          <ConfirmDialog
            open={confirm_open}
            title="Remove the rewritten prose?"
            confirm_label="Remove rewrite"
            cancel_label="Cancel"
            confirm_variant="danger"
            onConfirm={handleConfirm}
            onCancel={() => setConfirmOpen(false)}
          >
            <div data-testid="g6-confirm-body">
              This creates a new session version (v{next_version_number}). The canonical
              deterministic output is unchanged.
            </div>
          </ConfirmDialog>
        </>
      )}
    </section>
  );
}
