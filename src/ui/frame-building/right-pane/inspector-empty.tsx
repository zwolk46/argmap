import * as React from "react";
import type { ReactElement } from "react";
import { useFrameStore } from "@/state";

export interface InspectorEmptyProps {
  on_open_settings: () => void;
}

export function InspectorEmpty(props: InspectorEmptyProps): ReactElement {
  const { on_open_settings } = props;
  const frame = useFrameStore((s) => s.frame);

  if (!frame) {
    return (
      <div
        style={{
          color: "var(--color-text-secondary, #6b7280)",
          fontSize: "var(--font-size-sm, 13px)",
        }}
      >
        No frame loaded.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4, 16px)" }}>
      <section>
        <div style={LABEL_STYLE}>Title</div>
        <div style={VALUE_STYLE}>{frame.title || "(untitled)"}</div>
        {frame.description && (
          <>
            <div style={{ ...LABEL_STYLE, marginTop: "var(--space-2, 8px)" }}>Description</div>
            <div style={VALUE_STYLE}>{frame.description}</div>
          </>
        )}
      </section>

      <section>
        <div style={LABEL_STYLE}>Mode &amp; Flavor</div>
        <div style={VALUE_STYLE}>
          {frame.mode === "legal" ? "Legal" : "General"}
          {frame.flavor ? ` / ${frame.flavor}` : ""}
        </div>
      </section>

      {frame.tags && frame.tags.length > 0 && (
        <section>
          <div style={LABEL_STYLE}>Tags</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
            {frame.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  background: "var(--color-surface-pane, #f3f4f6)",
                  fontSize: "var(--font-size-xs, 11px)",
                  color: "var(--color-text-secondary, #6b7280)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <div style={LABEL_STYLE}>Default Satisfaction Policies</div>
        <div
          style={{
            marginTop: "4px",
            fontSize: "var(--font-size-sm, 13px)",
            color: "var(--color-text-secondary, #6b7280)",
          }}
        >
          {Object.entries(frame.default_satisfaction_policies ?? {}).map(([type, policy]) => (
            <div
              key={type}
              style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}
            >
              <span>{type}</span>
              <span>
                {policy ? (policy.all_of?.length ?? 0) + " condition(s)" : "library default"}
              </span>
            </div>
          ))}
          <button
            type="button"
            style={{
              marginTop: "8px",
              background: "none",
              border: "none",
              padding: 0,
              color: "var(--color-accent, #6366f1)",
              cursor: "pointer",
              fontSize: "var(--font-size-sm, 13px)",
              textDecoration: "underline",
            }}
            onClick={on_open_settings}
          >
            Edit in settings
          </button>
        </div>
      </section>
    </div>
  );
}

const LABEL_STYLE: React.CSSProperties = {
  textTransform: "uppercase",
  fontSize: "var(--font-size-xs, 11px)",
  color: "var(--color-text-secondary, #6b7280)",
  letterSpacing: "0.05em",
  marginBottom: "2px",
};

const VALUE_STYLE: React.CSSProperties = {
  fontSize: "var(--font-size-sm, 13px)",
  color: "var(--color-text-primary, #111827)",
};
