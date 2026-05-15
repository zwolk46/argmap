import * as React from "react";
import type { ReactElement } from "react";
import type { Authority, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Button } from "../../../primitives";
import { FieldAttributionDecoration } from "../field-attribution-decoration";

export interface AuthorityEditorProps {
  node: Authority;
  on_pick_binding_in_jurisdiction: () => void;
}

const SECTION_STYLE: React.CSSProperties = { marginBottom: "var(--space-3)" };

const CHIP_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-1)",
  padding: "2px var(--space-2)",
  background: "var(--color-primary-subtle)",
  color: "var(--color-primary)",
  borderRadius: "var(--radius-full)",
  fontSize: "var(--font-size-sm)",
};

export function AuthorityEditor(props: AuthorityEditorProps): ReactElement {
  const { node, on_pick_binding_in_jurisdiction } = props;
  const { frame_store } = useRepository();
  const mode = useFrameStore((s) => s.frame?.mode);
  const flavor = useFrameStore((s) => s.frame?.flavor);

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
    <div>
      <div style={SECTION_STYLE}>
        <FieldAttributionDecoration node_id={node.id} field_path="short_label" label={sourceLabel}>
          <input
            type="text"
            className="argmap-input"
            defaultValue={node.short_label ?? ""}
            onBlur={(e) => patch({ short_label: e.currentTarget.value || undefined })}
          />
        </FieldAttributionDecoration>
      </div>

      <div style={SECTION_STYLE}>
        <FieldAttributionDecoration node_id={node.id} field_path="citation" label="Citation">
          <input
            type="text"
            className="argmap-input"
            defaultValue={node.citation}
            onBlur={(e) => patch({ citation: e.currentTarget.value })}
          />
        </FieldAttributionDecoration>
      </div>

      {isLegal && (
        <>
          <div style={SECTION_STYLE}>
            <label className="argmap-section-heading">Jurisdiction</label>
            <div
              style={{
                marginTop: "var(--space-1)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1)",
              }}
            >
              <input
                type="text"
                className="argmap-input"
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
              <input
                type="text"
                className="argmap-input"
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
              <input
                type="text"
                className="argmap-input"
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

          <div style={SECTION_STYLE}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                defaultChecked={node.is_binding ?? false}
                onChange={(e) => patch({ is_binding: e.currentTarget.checked })}
              />
              <span className="argmap-section-heading">Is Binding</span>
            </label>
          </div>

          <div style={SECTION_STYLE}>
            <label className="argmap-section-heading">Binding In</label>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-1)",
                marginTop: "var(--space-1)",
                marginBottom: "var(--space-1)",
              }}
            >
              {(node.binding_in ?? []).map((j, i) => (
                <span key={i} style={CHIP_STYLE}>
                  {j.level}
                  {j.region ? ` / ${j.region}` : ""}
                </span>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={on_pick_binding_in_jurisdiction}>
              + Add jurisdiction
            </Button>
          </div>
        </>
      )}

      {isAcademic && (
        <>
          <div style={SECTION_STYLE}>
            <FieldAttributionDecoration node_id={node.id} field_path="author" label="Author">
              <input
                type="text"
                className="argmap-input"
                defaultValue={node.author ?? ""}
                onBlur={(e) => patch({ author: e.currentTarget.value || undefined })}
              />
            </FieldAttributionDecoration>
          </div>

          <div style={SECTION_STYLE}>
            <FieldAttributionDecoration
              node_id={node.id}
              field_path="venue"
              label="Venue / Journal"
            >
              <input
                type="text"
                className="argmap-input"
                defaultValue={node.venue ?? ""}
                onBlur={(e) => patch({ venue: e.currentTarget.value || undefined })}
              />
            </FieldAttributionDecoration>
          </div>

          <div style={SECTION_STYLE}>
            <FieldAttributionDecoration
              node_id={node.id}
              field_path="position"
              label="Position / Argument"
            >
              <input
                type="text"
                className="argmap-input"
                defaultValue={node.position ?? ""}
                onBlur={(e) => patch({ position: e.currentTarget.value || undefined })}
              />
            </FieldAttributionDecoration>
          </div>
        </>
      )}
    </div>
  );
}
