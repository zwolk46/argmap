import * as React from "react";
import type { ReactElement } from "react";
import { useSessionStore, useRepository } from "@/state";
import { Button } from "../primitives";

export function MetadataSection(): ReactElement {
  const title = useSessionStore((s) => s.session?.title ?? "");
  const description = useSessionStore((s) => s.session?.description ?? "");
  const archived = useSessionStore((s) => s.session?.archived ?? false);
  const { session_store } = useRepository();

  const [draft_title, setDraftTitle] = React.useState(title);
  const [draft_description, setDraftDescription] = React.useState(description);
  React.useEffect(() => setDraftTitle(title), [title]);
  React.useEffect(() => setDraftDescription(description), [description]);

  function commitTitle(): void {
    // §9 #27: empty / whitespace-only titles silently persisted as "" — the
    // session list later rendered an unnamed row. Require a non-empty trimmed
    // value; otherwise revert to the live title (the next render resets the
    // input via the title-effect above).
    const trimmed = draft_title.trim();
    if (trimmed.length === 0) {
      setDraftTitle(title);
      return;
    }
    if (trimmed !== title) {
      session_store
        .getState()
        .applyPatch({ kind: "session_metadata_edited", partial: { title: trimmed } });
    }
  }
  function commitDescription(): void {
    if (draft_description !== description) {
      session_store.getState().applyPatch({
        kind: "session_metadata_edited",
        partial: { description: draft_description },
      });
    }
  }
  function unarchive(): void {
    session_store
      .getState()
      .applyPatch({ kind: "session_metadata_edited", partial: { archived: false } });
  }

  return (
    <section data-testid="metadata-section" style={{ marginBottom: "var(--space-3)" }}>
      {archived ? (
        <div
          data-testid="archived-banner"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "var(--space-2) var(--space-3)",
            background: "var(--color-background-warning)",
            color: "var(--color-text-warning)",
            fontSize: "var(--font-size-sm)",
            marginBottom: "var(--space-2)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <span>This session is archived</span>
          <Button variant="secondary" size="sm" data-testid="unarchive-button" onClick={unarchive}>
            Unarchive
          </Button>
        </div>
      ) : null}
      <header
        style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-medium)",
          marginBottom: "var(--space-2)",
        }}
      >
        Metadata
      </header>
      <label style={{ display: "block", marginBottom: "var(--space-2)" }}>
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-secondary)",
          }}
        >
          Title
        </span>
        <input
          data-testid="metadata-title-input"
          type="text"
          value={draft_title}
          onChange={(e) => setDraftTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setDraftTitle(title);
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          className="argmap-input"
        />
      </label>
      <label style={{ display: "block" }}>
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-secondary)",
          }}
        >
          Description
        </span>
        <textarea
          data-testid="metadata-description-input"
          value={draft_description}
          onChange={(e) => setDraftDescription(e.target.value)}
          onBlur={commitDescription}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLTextAreaElement).blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setDraftDescription(description);
              (e.currentTarget as HTMLTextAreaElement).blur();
            }
          }}
          rows={3}
          className="argmap-input"
        />
      </label>
    </section>
  );
}
