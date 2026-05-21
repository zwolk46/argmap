import { useState, useEffect, type ReactElement } from "react";
import { useFrameStore, useRepository } from "@/state";
import { Input } from "#components/ui/input";
import { Textarea } from "#components/ui/textarea";
import { Label } from "#components/ui/label";

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
    <div className="flex flex-col gap-4">
      {frame.archived && (
        <div className="rounded-md border border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          This frame is archived.
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Label htmlFor="metadata-title">Title</Label>
        <Input
          id="metadata-title"
          type="text"
          value={title}
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

      <div className="flex flex-col gap-1">
        <Label htmlFor="metadata-description">Description</Label>
        <Textarea
          id="metadata-description"
          value={description}
          rows={3}
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

      <div className="flex flex-col gap-1">
        <Label htmlFor="metadata-tags">Tags (comma-separated)</Label>
        <Input
          id="metadata-tags"
          type="text"
          value={tags_raw}
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
