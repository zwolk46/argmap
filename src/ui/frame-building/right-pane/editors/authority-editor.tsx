import * as React from "react";
import type { ReactElement } from "react";
import { Plus } from "@phosphor-icons/react";
import type { Authority, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";
import { Checkbox } from "#components/ui/checkbox";
import { FieldAttributionDecoration } from "../field-attribution-decoration";

export interface AuthorityEditorProps {
  node: Authority;
}

export function AuthorityEditor(props: AuthorityEditorProps): ReactElement {
  const { node } = props;
  const { frame_store } = useRepository();
  const mode = useFrameStore((s) => s.frame?.mode);
  const flavor = useFrameStore((s) => s.frame?.flavor);
  const [adding_jurisdiction, set_adding_jurisdiction] = React.useState(false);
  const [new_juris_level, set_new_juris_level] = React.useState("");
  const [new_juris_region, set_new_juris_region] = React.useState("");
  const [new_juris_court, set_new_juris_court] = React.useState("");

  function patch(partial: object) {
    frame_store.getState().applyPatch({
      kind: "node_edited",
      node_id: node.id,
      partial: partial as unknown as Partial<Node>,
    });
  }

  // "name" maps to short_label (the authority has no `name` field in schema)
  // label is "Source" in personal flavor
  const sourceLabel = flavor === "personal" ? "Source" : "Name";

  const isAcademic = flavor === "academic";
  const isLegal = mode === "legal";

  return (
    <div className="flex flex-col gap-3">
      <FieldAttributionDecoration node_id={node.id} field_path="short_label" label={sourceLabel}>
        <Input
          type="text"
          defaultValue={node.short_label ?? ""}
          onBlur={(e) => patch({ short_label: e.currentTarget.value || undefined })}
        />
      </FieldAttributionDecoration>

      <FieldAttributionDecoration node_id={node.id} field_path="citation" label="Citation">
        <Input
          type="text"
          defaultValue={node.citation}
          onBlur={(e) => patch({ citation: e.currentTarget.value })}
        />
      </FieldAttributionDecoration>

      {isLegal && (
        <>
          <div className="flex flex-col gap-1">
            <Label>Jurisdiction</Label>
            <div className="flex flex-col gap-1">
              <Input
                type="text"
                placeholder="Level (e.g. federal, state)"
                defaultValue={node.jurisdiction?.level ?? ""}
                onBlur={(e) => {
                  const level = e.currentTarget.value as Authority["jurisdiction"] extends
                    | { level: infer L }
                    | undefined
                    ? L
                    : never;
                  if (level) {
                    patch({ jurisdiction: { ...node.jurisdiction, level } });
                  }
                }}
              />
              <Input
                type="text"
                placeholder="Region / Circuit"
                defaultValue={node.jurisdiction?.region ?? ""}
                onBlur={(e) => {
                  patch({
                    jurisdiction: {
                      ...node.jurisdiction,
                      region: e.currentTarget.value || undefined,
                    },
                  });
                }}
              />
              <Input
                type="text"
                placeholder="Court"
                defaultValue={node.jurisdiction?.court ?? ""}
                onBlur={(e) => {
                  patch({
                    jurisdiction: {
                      ...node.jurisdiction,
                      court: e.currentTarget.value || undefined,
                    },
                  });
                }}
              />
            </div>
          </div>

          <Label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              defaultChecked={node.is_binding ?? false}
              onCheckedChange={(checked) => patch({ is_binding: checked === true })}
            />
            <span>Is Binding</span>
          </Label>

          <div className="flex flex-col gap-1">
            <Label>Binding In</Label>
            <div className="mb-1 flex flex-wrap gap-1">
              {(node.binding_in ?? []).map((j, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-sm text-primary"
                >
                  {j.level}
                  {j.region ? ` / ${j.region}` : ""}
                  {j.court ? ` (${j.court})` : ""}
                </span>
              ))}
            </div>
            {adding_jurisdiction ? (
              <div className="flex flex-col gap-1">
                <Input
                  type="text"
                  placeholder="Level (required, e.g. federal, state)"
                  value={new_juris_level}
                  onChange={(e) => set_new_juris_level(e.currentTarget.value)}
                  autoFocus
                />
                <Input
                  type="text"
                  placeholder="Region / Circuit (optional)"
                  value={new_juris_region}
                  onChange={(e) => set_new_juris_region(e.currentTarget.value)}
                />
                <Input
                  type="text"
                  placeholder="Court (optional)"
                  value={new_juris_court}
                  onChange={(e) => set_new_juris_court(e.currentTarget.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!new_juris_level.trim()}
                    onClick={() => {
                      const j: { level: string; region?: string; court?: string } = {
                        level: new_juris_level.trim(),
                      };
                      if (new_juris_region.trim()) j.region = new_juris_region.trim();
                      if (new_juris_court.trim()) j.court = new_juris_court.trim();
                      patch({
                        binding_in: [...(node.binding_in ?? []), j],
                      });
                      set_new_juris_level("");
                      set_new_juris_region("");
                      set_new_juris_court("");
                      set_adding_jurisdiction(false);
                    }}
                  >
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      set_new_juris_level("");
                      set_new_juris_region("");
                      set_new_juris_court("");
                      set_adding_jurisdiction(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <Button variant="ghost" size="sm" onClick={() => set_adding_jurisdiction(true)}>
                  <Plus size={12} />
                  Add jurisdiction
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {isAcademic && (
        <>
          <FieldAttributionDecoration node_id={node.id} field_path="author" label="Author">
            <Input
              type="text"
              defaultValue={node.author ?? ""}
              onBlur={(e) => patch({ author: e.currentTarget.value || undefined })}
            />
          </FieldAttributionDecoration>

          <FieldAttributionDecoration node_id={node.id} field_path="venue" label="Venue / Journal">
            <Input
              type="text"
              defaultValue={node.venue ?? ""}
              onBlur={(e) => patch({ venue: e.currentTarget.value || undefined })}
            />
          </FieldAttributionDecoration>

          <FieldAttributionDecoration
            node_id={node.id}
            field_path="position"
            label="Position / Argument"
          >
            <Input
              type="text"
              defaultValue={node.position ?? ""}
              onBlur={(e) => patch({ position: e.currentTarget.value || undefined })}
            />
          </FieldAttributionDecoration>
        </>
      )}
    </div>
  );
}
