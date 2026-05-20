import * as React from "react";
import type { ReactElement } from "react";
import { X } from "@phosphor-icons/react";
import type { Conclusion, ConclusionDirection, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Textarea } from "#components/ui/textarea";
import { Label } from "#components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components/ui/select";
import { FieldAttributionDecoration } from "../field-attribution-decoration";

export interface ConclusionEditorProps {
  node: Conclusion;
}

const LEGAL_DIRECTION_VALUES = [
  "affirm",
  "reverse",
  "remand",
  "dismiss",
  "favors_plaintiff",
  "favors_defendant",
  "custom",
] as const;

const POSITION_NONE = "__none__";

export function ConclusionEditor(props: ConclusionEditorProps): ReactElement {
  const { node } = props;
  const { frame_store } = useRepository();
  const mode = useFrameStore((s) => s.frame?.mode);
  const positions = useFrameStore((s) => s.frame?.positions);
  const [tag_input, setTagInput] = React.useState("");

  function patch(partial: object) {
    frame_store.getState().applyPatch({
      kind: "node_edited",
      node_id: node.id,
      partial: partial as unknown as Partial<Node>,
    });
  }

  function handleDirectionChange(value: string) {
    if (mode === "legal") {
      const dir: ConclusionDirection = {
        kind: "legal",
        value: value as (typeof LEGAL_DIRECTION_VALUES)[number],
      };
      patch({ direction: dir });
    } else {
      const dir: ConclusionDirection = {
        kind: "general",
        position_id: value === POSITION_NONE ? "" : value,
      };
      patch({ direction: dir });
    }
  }

  function removeTag(tag: string) {
    const next = (node.tags ?? []).filter((t) => t !== tag);
    patch({ tags: next });
  }

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    const next = [...(node.tags ?? []), trimmed];
    patch({ tags: next });
    setTagInput("");
  }

  const currentDirectionValue =
    node.direction.kind === "legal"
      ? node.direction.value
      : node.direction.position_id || POSITION_NONE;

  return (
    <div className="flex flex-col gap-3">
      <FieldAttributionDecoration node_id={node.id} field_path="statement" label="Statement">
        <Textarea
          rows={3}
          defaultValue={node.statement}
          onBlur={(e) => patch({ statement: e.currentTarget.value })}
        />
      </FieldAttributionDecoration>

      <div className="flex flex-col gap-1">
        <Label>Direction</Label>
        <Select value={currentDirectionValue} onValueChange={handleDirectionChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mode === "legal" ? (
              LEGAL_DIRECTION_VALUES.map((v) => (
                <SelectItem key={v} value={v}>
                  {v.replace(/_/g, " ")}
                </SelectItem>
              ))
            ) : (
              <>
                <SelectItem value={POSITION_NONE}>— Select position —</SelectItem>
                {(positions ?? []).map((pos) => (
                  <SelectItem key={pos.id} value={pos.id}>
                    {pos.label}
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      <FieldAttributionDecoration
        node_id={node.id}
        field_path="reasoning_summary"
        label="Reasoning Summary"
      >
        <Textarea
          rows={2}
          defaultValue={node.reasoning_summary ?? ""}
          onBlur={(e) => patch({ reasoning_summary: e.currentTarget.value || undefined })}
        />
      </FieldAttributionDecoration>

      <div className="flex flex-col gap-1">
        <Label>Tags</Label>
        <div className="mb-1 flex flex-wrap gap-1">
          {(node.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-sm"
            >
              {tag}
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-0.5 hover:bg-accent"
                onClick={() => removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            className="flex-1"
            value={tag_input}
            placeholder="Add tag…"
            onChange={(e) => setTagInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(tag_input);
              }
            }}
          />
          <Button variant="outline" size="sm" onClick={() => addTag(tag_input)}>
            Add
          </Button>
        </div>
      </div>

      {mode === "legal" && (
        <FieldAttributionDecoration node_id={node.id} field_path="remedy" label="Remedy">
          <Input
            type="text"
            defaultValue={node.remedy ?? ""}
            onBlur={(e) => patch({ remedy: e.currentTarget.value || undefined })}
          />
        </FieldAttributionDecoration>
      )}
    </div>
  );
}
