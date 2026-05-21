import * as React from "react";
import type { ReactElement } from "react";
import { useSessionStore, useRepository } from "@/state";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Textarea } from "#components/ui/textarea";
import { Label } from "#components/ui/label";
import { Alert } from "#components/ui/alert";

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
  const title_id = React.useId();
  const description_id = React.useId();
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
    <section data-testid="metadata-section" className="mb-3">
      {archived ? (
        <Alert
          data-testid="archived-banner"
          // "Archived" is a persistent informational state, not a transient
          // alert. role="status" + aria-live="polite" matches the semantic
          // so AT users hear it as orientation, not as an interruption.
          role="status"
          aria-live="polite"
          className="mb-2 flex items-center justify-between gap-2 px-3 py-2 text-sm"
        >
          <span>This session is archived</span>
          <Button variant="secondary" size="sm" data-testid="unarchive-button" onClick={unarchive}>
            Unarchive
          </Button>
        </Alert>
      ) : null}
      <header className="mb-2 text-sm font-medium">Metadata</header>
      <div className="mb-2">
        <Label htmlFor={title_id} className="text-xs text-muted-foreground font-normal">
          Title
        </Label>
        <Input
          id={title_id}
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
          className="mt-1"
        />
        {show_title_counter ? (
          <p
            id={title_counter_id}
            data-testid="metadata-title-counter"
            className="mt-1 text-xs text-muted-foreground"
          >
            {draft_title.length} / {title_max}
          </p>
        ) : null}
      </div>
      <div>
        <Label htmlFor={description_id} className="text-xs text-muted-foreground font-normal">
          Description
        </Label>
        <Textarea
          id={description_id}
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
          className="mt-1"
        />
        {show_description_counter ? (
          <p
            id={description_counter_id}
            data-testid="metadata-description-counter"
            className="mt-1 text-xs text-muted-foreground"
          >
            {draft_description.length} / {description_max}
          </p>
        ) : null}
      </div>
    </section>
  );
}
