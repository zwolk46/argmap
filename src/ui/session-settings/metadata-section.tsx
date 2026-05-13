import * as React from "react";
import type { ReactElement } from "react";
import { useSessionStore, useRepository } from "@/state";

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
    if (draft_title !== title) {
      session_store
        .getState()
        .applyPatch({ kind: "session_metadata_edited", partial: { title: draft_title } });
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
    <section data-testid="metadata-section" style={{ marginBottom: "var(--space-3, 12px)" }}>
      {archived ? (
        <div
          data-testid="archived-banner"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "var(--space-2, 8px) var(--space-3, 12px)",
            background: "var(--color-background-warning, #fef3c7)",
            color: "var(--color-text-warning, #92400e)",
            fontSize: "var(--font-size-sm, 13px)",
            marginBottom: "var(--space-2, 8px)",
            borderRadius: "var(--radius-md, 6px)",
          }}
        >
          <span>This session is archived</span>
          <button
            type="button"
            data-testid="unarchive-button"
            onClick={unarchive}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-mode-current-accent, #1d4ed8)",
              cursor: "pointer",
            }}
          >
            Unarchive
          </button>
        </div>
      ) : null}
      <header
        style={{
          fontSize: "var(--font-size-sm, 13px)",
          fontWeight: 500,
          marginBottom: "var(--space-2, 8px)",
        }}
      >
        Metadata
      </header>
      <label style={{ display: "block", marginBottom: "var(--space-2, 8px)" }}>
        <span
          style={{
            fontSize: "var(--font-size-xs, 11px)",
            color: "var(--color-text-secondary, #6b7280)",
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
          style={{
            width: "100%",
            padding: "var(--space-1, 4px) var(--space-2, 8px)",
            fontSize: "var(--font-size-sm, 13px)",
          }}
        />
      </label>
      <label style={{ display: "block" }}>
        <span
          style={{
            fontSize: "var(--font-size-xs, 11px)",
            color: "var(--color-text-secondary, #6b7280)",
          }}
        >
          Description
        </span>
        <textarea
          data-testid="metadata-description-input"
          value={draft_description}
          onChange={(e) => setDraftDescription(e.target.value)}
          onBlur={commitDescription}
          rows={3}
          style={{
            width: "100%",
            padding: "var(--space-1, 4px) var(--space-2, 8px)",
            fontSize: "var(--font-size-sm, 13px)",
          }}
        />
      </label>
    </section>
  );
}
