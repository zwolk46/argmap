import * as React from "react";
import type { ReactElement } from "react";
import type { Edge } from "@/schema";
import { useRepository } from "@/state";

export interface EdgeEditorProps {
  edge: Edge;
}

const SECTION_STYLE: React.CSSProperties = { marginBottom: "var(--space-3)" };

const EDGE_TYPE_BADGE: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 10px",
  background: "var(--color-surface-muted)",
  border: "var(--border-hairline) solid var(--color-border-subtle)",
  borderRadius: "var(--radius-sm)",
  fontSize: "var(--font-size-sm)",
  fontWeight: "var(--font-weight-semibold)",
  letterSpacing: "var(--letter-spacing-wide)",
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
        <label className="argmap-section-heading">Edge Type</label>
        <div style={{ marginTop: "var(--space-1)" }}>
          <span style={EDGE_TYPE_BADGE}>{edge.type}</span>
        </div>
      </div>

      <div style={SECTION_STYLE}>
        <label className="argmap-section-heading">Label</label>
        <input
          type="text"
          className="argmap-input"
          style={{ marginTop: "var(--space-1)" }}
          defaultValue={edge.label ?? ""}
          onBlur={(e) => patch({ label: e.currentTarget.value || undefined })}
        />
      </div>

      {edge.type === "FORECLOSES" && (
        <div style={SECTION_STYLE}>
          <label className="argmap-section-heading">Scope</label>
          <select
            className="argmap-input"
            style={{ marginTop: "var(--space-1)" }}
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
          <label className="argmap-section-heading">Weight</label>
          <select
            className="argmap-input"
            style={{ marginTop: "var(--space-1)" }}
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
          <label className="argmap-section-heading">Strength</label>
          <select
            className="argmap-input"
            style={{ marginTop: "var(--space-1)" }}
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
