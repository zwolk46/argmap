import * as React from "react";
import type { ReactElement } from "react";
import { useFrameStore } from "@/state";
import { Button, humanizeNodeType, InlineEmpty } from "../../primitives";

export interface InspectorEmptyProps {
  on_open_settings: () => void;
}

export function InspectorEmpty(props: InspectorEmptyProps): ReactElement {
  const { on_open_settings } = props;
  const frame = useFrameStore((s) => s.frame);

  if (!frame) {
    return <InlineEmpty testId="inspector-no-frame">No frame loaded.</InlineEmpty>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <section
        style={{
          padding: "var(--space-3)",
          background: "var(--color-surface-pane)",
          border: "var(--border-hairline) solid var(--color-border-subtle)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-text-secondary)",
          fontSize: "var(--font-size-sm)",
          lineHeight: "var(--line-height-snug)",
        }}
        aria-label="Inspector hint"
      >
        Select a node on the canvas to edit it here. With nothing selected, this panel shows the
        frame's overall settings.
      </section>

      <section>
        <h3 className="argmap-section-heading" style={{ marginBottom: "var(--space-1)" }}>
          Title
        </h3>
        <div style={VALUE_STYLE}>{frame.title || "Untitled frame"}</div>
        {frame.description && (
          <>
            <h3
              className="argmap-section-heading"
              style={{ marginTop: "var(--space-2)", marginBottom: "var(--space-1)" }}
            >
              Description
            </h3>
            <div style={VALUE_STYLE}>{frame.description}</div>
          </>
        )}
      </section>

      <section>
        <h3 className="argmap-section-heading" style={{ marginBottom: "var(--space-1)" }}>
          Mode &amp; Flavor
        </h3>
        <div style={VALUE_STYLE}>
          {frame.mode === "legal" ? "Legal" : "General"}
          {frame.flavor ? ` / ${frame.flavor}` : ""}
        </div>
      </section>

      {frame.tags && frame.tags.length > 0 && (
        <section>
          <h3 className="argmap-section-heading" style={{ marginBottom: "var(--space-1)" }}>
            Tags
          </h3>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-1)",
              marginTop: "var(--space-1)",
            }}
          >
            {frame.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "2px var(--space-2)",
                  borderRadius: "var(--radius-pill)",
                  background: "var(--color-surface-pane)",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="argmap-section-heading" style={{ marginBottom: "var(--space-1)" }}>
          Default Satisfaction Policies
        </h3>
        <div
          style={{
            marginTop: "var(--space-1)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-secondary)",
          }}
        >
          {Object.entries(frame.default_satisfaction_policies ?? {}).map(([type, policy]) => (
            <div
              key={type}
              style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}
            >
              <span>{humanizeNodeType(type)}</span>
              <span>
                {policy
                  ? `${policy.all_of?.length ?? 0} condition${policy.all_of?.length === 1 ? "" : "s"}`
                  : "system default"}
              </span>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={on_open_settings}
            style={{ marginTop: "var(--space-2)" }}
          >
            Edit in settings
          </Button>
        </div>
      </section>
    </div>
  );
}

const VALUE_STYLE: React.CSSProperties = {
  fontSize: "var(--font-size-sm)",
  color: "var(--color-text-primary)",
  lineHeight: "var(--line-height-snug)",
};
