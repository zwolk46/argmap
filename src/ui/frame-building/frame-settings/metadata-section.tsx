import { useState, useEffect, type ReactElement } from "react";
import { useFrameStore, useRepository } from "@/state";

export function MetadataSection(): ReactElement | null {
  const frame = useFrameStore((s) => s.frame);
  const { frame_store } = useRepository();

  const [title, setTitle] = useState(frame?.title ?? "");
  const [description, setDescription] = useState(frame?.description ?? "");
  const [tags_raw, setTagsRaw] = useState((frame?.tags ?? []).join(", "));

  // Keep local state in sync when frame changes from outside
  useEffect(() => {
    if (frame) {
      setTitle(frame.title);
      setDescription(frame.description ?? "");
      setTagsRaw((frame.tags ?? []).join(", "));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame?.id]); // intentionally keyed on id only to sync on frame switch, not on every edit

  if (!frame) return null;

  function commitTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === frame!.title) return;
    frame_store.getState().applyPatch({ kind: "metadata_edited", partial: { title: trimmed } });
  }

  function commitDescription() {
    const trimmed = description.trim() || undefined;
    if (trimmed === (frame!.description ?? undefined)) return;
    frame_store
      .getState()
      .applyPatch({ kind: "metadata_edited", partial: { description: trimmed } });
  }

  function commitTags() {
    const tags = tags_raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    frame_store.getState().applyPatch({ kind: "metadata_edited", partial: { tags } });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4, 16px)" }}>
      {frame.archived && (
        <div
          style={{
            padding: "var(--space-2, 8px) var(--space-3, 12px)",
            background: "var(--color-severity-warning-bg, #fef9c3)",
            border: "1px solid var(--color-severity-warning, #ca8a04)",
            borderRadius: "var(--radius-sm, 4px)",
            fontSize: "var(--font-size-sm, 13px)",
            color: "var(--color-severity-warning, #ca8a04)",
          }}
        >
          This frame is archived.
        </div>
      )}

      <div>
        <label
          className="argmap-section-heading"
          style={{ display: "block", marginBottom: "var(--space-1, 4px)" }}
          htmlFor="metadata-title"
        >
          Title
        </label>
        <input
          id="metadata-title"
          type="text"
          value={title}
          className="argmap-input"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            else if (e.key === "Escape") {
              setTitle(frame?.title ?? "");
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
        />
      </div>

      <div>
        <label
          className="argmap-section-heading"
          style={{ display: "block", marginBottom: "var(--space-1, 4px)" }}
          htmlFor="metadata-description"
        >
          Description
        </label>
        <textarea
          id="metadata-description"
          value={description}
          rows={3}
          className="argmap-input"
          style={{ resize: "vertical" }}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={commitDescription}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLTextAreaElement).blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setDescription(frame?.description ?? "");
              (e.currentTarget as HTMLTextAreaElement).blur();
            }
          }}
        />
      </div>

      <div>
        <label
          className="argmap-section-heading"
          style={{ display: "block", marginBottom: "var(--space-1, 4px)" }}
          htmlFor="metadata-tags"
        >
          Tags (comma-separated)
        </label>
        <input
          id="metadata-tags"
          type="text"
          value={tags_raw}
          className="argmap-input"
          onChange={(e) => setTagsRaw(e.target.value)}
          onBlur={commitTags}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            else if (e.key === "Escape") {
              setTagsRaw((frame?.tags ?? []).join(", "));
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
        />
      </div>
    </div>
  );
}
