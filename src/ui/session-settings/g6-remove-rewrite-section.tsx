import * as React from "react";
import type { ReactElement } from "react";
import { useSessionStore, useRepository } from "@/state";
import { Button, ConfirmDialog } from "../primitives";

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
    <section data-testid="g6-section" style={{ marginBottom: "var(--space-3, 12px)" }}>
      <header
        style={{
          fontSize: "var(--font-size-sm, 13px)",
          fontWeight: "var(--font-weight-medium)",
          marginBottom: "var(--space-2, 8px)",
        }}
      >
        Output rewrite (G6)
      </header>
      {!has_rewrite ? (
        <p
          data-testid="g6-empty-state"
          style={{
            fontSize: "var(--font-size-sm, 13px)",
            color: "var(--color-text-secondary, #6b7280)",
          }}
        >
          No rewritten prose for this session. Use the 'Rewrite' button in the prose tab of the
          output viewer to generate one.
        </p>
      ) : (
        <>
          <p
            data-testid="g6-preview"
            style={{
              fontSize: "var(--font-size-sm, 13px)",
              color: "var(--color-text-primary, #111827)",
              fontStyle: "italic",
            }}
          >
            {preview_text}
          </p>
          <Button
            variant="destructive"
            size="md"
            data-testid="g6-remove-button"
            onClick={() => setConfirmOpen(true)}
            style={{ marginTop: "var(--space-2, 8px)" }}
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
