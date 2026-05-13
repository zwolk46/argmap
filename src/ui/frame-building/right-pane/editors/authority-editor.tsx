import * as React from "react";
import type { ReactElement } from "react";
import type { Authority, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { FieldAttributionDecoration } from "../field-attribution-decoration";

export interface AuthorityEditorProps {
  node: Authority;
  on_pick_binding_in_jurisdiction: () => void;
}

const SECTION_STYLE: React.CSSProperties = { marginBottom: "var(--space-3, 12px)" };

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "4px 8px",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: "var(--radius-sm, 4px)",
  fontSize: "var(--font-size-sm, 13px)",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const LABEL_STYLE: React.CSSProperties = {
  textTransform: "uppercase",
  fontSize: "var(--font-size-xs, 11px)",
  color: "var(--color-text-secondary, #6b7280)",
  letterSpacing: "0.05em",
};

const CHIP_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "2px 8px",
  background: "var(--color-primary-subtle, #eff6ff)",
  color: "var(--color-primary, #2563eb)",
  borderRadius: "var(--radius-full, 9999px)",
  fontSize: "var(--font-size-sm, 13px)",
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
            style={INPUT_STYLE}
            defaultValue={node.short_label ?? ""}
            onBlur={(e) => patch({ short_label: e.currentTarget.value || undefined })}
          />
        </FieldAttributionDecoration>
      </div>

      <div style={SECTION_STYLE}>
        <FieldAttributionDecoration node_id={node.id} field_path="citation" label="Citation">
          <input
            type="text"
            style={INPUT_STYLE}
            defaultValue={node.citation}
            onBlur={(e) => patch({ citation: e.currentTarget.value })}
          />
        </FieldAttributionDecoration>
      </div>

      {isLegal && (
        <>
          <div style={SECTION_STYLE}>
            <label style={LABEL_STYLE}>Jurisdiction</label>
            <div
              style={{
                marginTop: "4px",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1, 4px)",
              }}
            >
              <input
                type="text"
                style={INPUT_STYLE}
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
                style={INPUT_STYLE}
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
                style={INPUT_STYLE}
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
                gap: "var(--space-2, 8px)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                defaultChecked={node.is_binding ?? false}
                onChange={(e) => patch({ is_binding: e.currentTarget.checked })}
              />
              <span style={LABEL_STYLE}>Is Binding</span>
            </label>
          </div>

          <div style={SECTION_STYLE}>
            <label style={LABEL_STYLE}>Binding In</label>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-1, 4px)",
                marginTop: "4px",
                marginBottom: "4px",
              }}
            >
              {(node.binding_in ?? []).map((j, i) => (
                <span key={i} style={CHIP_STYLE}>
                  {j.level}
                  {j.region ? ` / ${j.region}` : ""}
                </span>
              ))}
            </div>
            <button
              style={{
                padding: "4px 10px",
                border: "1px dashed var(--color-border, #e5e7eb)",
                borderRadius: "var(--radius-sm, 4px)",
                background: "transparent",
                color: "var(--color-text-secondary, #6b7280)",
                fontSize: "var(--font-size-sm, 13px)",
                cursor: "pointer",
              }}
              onClick={on_pick_binding_in_jurisdiction}
            >
              + Add jurisdiction
            </button>
          </div>
        </>
      )}

      {isAcademic && (
        <>
          <div style={SECTION_STYLE}>
            <FieldAttributionDecoration node_id={node.id} field_path="author" label="Author">
              <input
                type="text"
                style={INPUT_STYLE}
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
                style={INPUT_STYLE}
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
                style={INPUT_STYLE}
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
