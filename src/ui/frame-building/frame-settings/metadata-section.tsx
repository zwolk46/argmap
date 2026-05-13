import { useState, useEffect, type ReactElement } from "react";
import { useFrameStore, useRepository } from "@/state";

const LABEL_STYLE: React.CSSProperties = {
  fontSize: "var(--font-size-xs, 11px)",
  fontWeight: 600,
  color: "var(--color-text-tertiary, #9ca3af)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "var(--space-1, 4px)",
  display: "block",
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2, 8px) var(--space-3, 12px)",
  fontSize: "var(--font-size-sm, 13px)",
  color: "var(--color-text-primary, #111827)",
  background: "var(--color-surface-pane, #f9fafb)",
  border: "var(--border-thin, 1px) solid var(--color-border-default, #e5e7eb)",
  borderRadius: "var(--radius-sm, 4px)",
  outline: "none",
  boxSizing: "border-box",
};

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
        <label style={LABEL_STYLE} htmlFor="metadata-title">
          Title
        </label>
        <input
          id="metadata-title"
          type="text"
          value={title}
          style={INPUT_STYLE}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
        />
      </div>

      <div>
        <label style={LABEL_STYLE} htmlFor="metadata-description">
          Description
        </label>
        <textarea
          id="metadata-description"
          value={description}
          rows={3}
          style={{ ...INPUT_STYLE, resize: "vertical" }}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={commitDescription}
        />
      </div>

      <div>
        <label style={LABEL_STYLE} htmlFor="metadata-tags">
          Tags (comma-separated)
        </label>
        <input
          id="metadata-tags"
          type="text"
          value={tags_raw}
          style={INPUT_STYLE}
          onChange={(e) => setTagsRaw(e.target.value)}
          onBlur={commitTags}
        />
      </div>
    </div>
  );
}
