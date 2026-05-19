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
  // §9 #39: only resync the draft from the store when the user has no
  // uncommitted edits. Otherwise a cross-tab update via Supabase realtime
  // silently overwrote whatever the user was typing. Compare against the
  // committed value (which is the previous store snapshot) — drift means
  // the user has unsaved input we shouldn't trample.
  const last_synced_title = React.useRef(title);
  const last_synced_description = React.useRef(description);
  React.useEffect(() => {
    if (draft_title === last_synced_title.current) {
      setDraftTitle(title);
    }
    last_synced_title.current = title;
  }, [title, draft_title]);
  React.useEffect(() => {
    if (draft_description === last_synced_description.current) {
      setDraftDescription(description);
    }
    last_synced_description.current = description;
  }, [description, draft_description]);

  // §13 #18: surface the pending silent-revert state through aria-invalid.
  const title_blank = draft_title.trim().length === 0;

  // §9 #40: bound both inputs and surface a counter only when nearing the
  // cap. 200 char title matches FrameTitle and the wizard; the description
  // gets a more generous cap since users use it for context notes.
  const title_counter_id = React.useId();
  const description_counter_id = React.useId();
  const title_max = 200;
  const description_max = 2000;
  const show_title_counter = draft_title.length > title_max * 0.8;
  const show_description_counter = draft_description.length > description_max * 0.8;

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
          required
          aria-required="true"
          aria-invalid={title_blank ? true : undefined}
          aria-describedby={show_title_counter ? title_counter_id : undefined}
          maxLength={title_max}
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
        {show_title_counter ? (
          <p
            id={title_counter_id}
            data-testid="metadata-title-counter"
            style={{
              margin: "var(--space-1) 0 0",
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-tertiary)",
            }}
          >
            {draft_title.length} / {title_max}
          </p>
        ) : null}
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
          maxLength={description_max}
          aria-describedby={show_description_counter ? description_counter_id : undefined}
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
        {show_description_counter ? (
          <p
            id={description_counter_id}
            data-testid="metadata-description-counter"
            style={{
              margin: "var(--space-1) 0 0",
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-tertiary)",
            }}
          >
            {draft_description.length} / {description_max}
          </p>
        ) : null}
      </label>
    </section>
  );
}
