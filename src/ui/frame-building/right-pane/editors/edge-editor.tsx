import * as React from "react";
import type { ReactElement } from "react";
import type { Edge } from "@/schema";
import { useRepository } from "@/state";

export interface EdgeEditorProps {
  edge: Edge;
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

const EDGE_TYPE_BADGE: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 10px",
  background: "var(--color-surface-muted, #f3f4f6)",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: "var(--radius-sm, 4px)",
  fontSize: "var(--font-size-sm, 13px)",
  fontWeight: 600,
  letterSpacing: "0.04em",
};

const WEIGHT_OPTIONS = ["strong", "moderate", "weak"] as const;
const STRENGTH_OPTIONS = ["directly_on_point", "analogous", "background"] as const;
const SCOPE_OPTIONS = ["moot", "decided"] as const;

export function EdgeEditor(props: EdgeEditorProps): ReactElement {
  const { edge } = props;
  const { frame_store } = useRepository();

  function patch(partial: Partial<Edge>) {
    frame_store.getState().applyPatch({ kind: "edge_edited", edge_id: edge.id, partial });
  }

  return (
    <div>
      <div style={SECTION_STYLE}>
        <label style={LABEL_STYLE}>Edge Type</label>
        <div style={{ marginTop: "4px" }}>
          <span style={EDGE_TYPE_BADGE}>{edge.type}</span>
        </div>
      </div>

      <div style={SECTION_STYLE}>
        <label style={LABEL_STYLE}>Label</label>
        <input
          type="text"
          style={{ ...INPUT_STYLE, marginTop: "4px" }}
          defaultValue={edge.label ?? ""}
          onBlur={(e) => patch({ label: e.currentTarget.value || undefined })}
        />
      </div>

      {edge.type === "FORECLOSES" && (
        <div style={SECTION_STYLE}>
          <label style={LABEL_STYLE}>Scope</label>
          <select
            style={{ ...INPUT_STYLE, marginTop: "4px" }}
            defaultValue={edge.scope ?? ""}
            onChange={(e) =>
              patch({
                scope: (e.currentTarget.value || undefined) as
                  | (typeof SCOPE_OPTIONS)[number]
                  | undefined,
              })
            }
          >
            <option value="">— None —</option>
            {SCOPE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {(edge.type === "SUPPORTS" || edge.type === "CONTRADICTS") && (
        <div style={SECTION_STYLE}>
          <label style={LABEL_STYLE}>Weight</label>
          <select
            style={{ ...INPUT_STYLE, marginTop: "4px" }}
            defaultValue={edge.weight ?? ""}
            onChange={(e) =>
              patch({
                weight: (e.currentTarget.value || undefined) as
                  | (typeof WEIGHT_OPTIONS)[number]
                  | undefined,
              })
            }
          >
            <option value="">— None —</option>
            {WEIGHT_OPTIONS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
      )}

      {edge.type === "CITES" && (
        <div style={SECTION_STYLE}>
          <label style={LABEL_STYLE}>Strength</label>
          <select
            style={{ ...INPUT_STYLE, marginTop: "4px" }}
            defaultValue={edge.strength ?? ""}
            onChange={(e) =>
              patch({
                strength: (e.currentTarget.value || undefined) as
                  | (typeof STRENGTH_OPTIONS)[number]
                  | undefined,
              })
            }
          >
            <option value="">— None —</option>
            {STRENGTH_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
