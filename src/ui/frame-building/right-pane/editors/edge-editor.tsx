import type { ReactElement } from "react";
import type { Edge } from "@/schema";
import { useRepository } from "@/state";
import { EDGE_TYPE_LABELS } from "@/ui/primitives";
import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components/ui/select";

export interface EdgeEditorProps {
  edge: Edge;
}

const WEIGHT_OPTIONS = ["strong", "moderate", "weak"] as const;
const STRENGTH_OPTIONS = ["directly_on_point", "analogous", "background"] as const;
const SCOPE_OPTIONS = ["moot", "decided"] as const;
const NONE = "__none__";

export function EdgeEditor(props: EdgeEditorProps): ReactElement {
  const { edge } = props;
  const { frame_store } = useRepository();

  function patch(partial: Partial<Edge>) {
    frame_store.getState().applyPatch({ kind: "edge_edited", edge_id: edge.id, partial });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label>Edge Type</Label>
        <div>
          <span className="inline-block rounded-md border border-border bg-muted px-2.5 py-0.5 text-sm font-semibold tracking-wide">
            {EDGE_TYPE_LABELS[edge.type] ?? edge.type}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label>Label</Label>
        <Input
          type="text"
          defaultValue={edge.label ?? ""}
          onBlur={(e) => patch({ label: e.currentTarget.value || undefined })}
        />
      </div>

      {edge.type === "FORECLOSES" && (
        <div className="flex flex-col gap-1">
          <Label>Scope</Label>
          <Select
            defaultValue={edge.scope ?? NONE}
            onValueChange={(value) =>
              patch({
                scope: value === NONE ? undefined : (value as (typeof SCOPE_OPTIONS)[number]),
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— None —</SelectItem>
              {SCOPE_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(edge.type === "SUPPORTS" || edge.type === "CONTRADICTS") && (
        <div className="flex flex-col gap-1">
          <Label>Weight</Label>
          <Select
            defaultValue={edge.weight ?? NONE}
            onValueChange={(value) =>
              patch({
                weight: value === NONE ? undefined : (value as (typeof WEIGHT_OPTIONS)[number]),
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— None —</SelectItem>
              {WEIGHT_OPTIONS.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {edge.type === "CITES" && (
        <div className="flex flex-col gap-1">
          <Label>Strength</Label>
          <Select
            defaultValue={edge.strength ?? NONE}
            onValueChange={(value) =>
              patch({
                strength: value === NONE ? undefined : (value as (typeof STRENGTH_OPTIONS)[number]),
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— None —</SelectItem>
              {STRENGTH_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
