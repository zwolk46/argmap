import * as React from "react";
import type { OutputViewPayload, SessionShape } from "@/state";
import { useAiSuggestion } from "@/ui";

export interface ProseTabProps {
  payload: OutputViewPayload | null;
}

export function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.resolve();
}

export function proseToMarkdown(canonical: string, shape: SessionShape): string {
  const heading =
    shape === "determinate"
      ? "## Conclusion"
      : shape === "conditional"
        ? "## Conditional conclusion"
        : shape === "contested"
          ? "## Contested"
          : "## Indeterminate";
  return `${heading}\n\n${canonical}`;
}

export function ProseTab(props: ProseTabProps): React.ReactElement {
  const { payload } = props;
  const aiSuggestion = useAiSuggestion("session");

  if (!payload || !payload.prose) {
    return (
      <div
        data-testid="prose-tab-empty"
        style={{
          padding: "var(--space-4, 16px)",
          color: "var(--color-text-tertiary, #9ca3af)",
          fontSize: "var(--font-size-sm, 13px)",
        }}
      >
        No prose available yet.
      </div>
    );
  }

  const canonical = payload.prose.canonical ?? "";
  const rewritten = payload.prose.rewritten;
  const shape = payload.shape;

  const heading =
    shape === "determinate"
      ? "Conclusion"
      : shape === "conditional"
        ? "Conditional conclusion"
        : shape === "contested"
          ? "Contested"
          : "Indeterminate";

  return (
    <div
      data-testid="prose-tab"
      style={{
        padding: "var(--space-4, 16px)",
        overflow: "auto",
        height: "100%",
      }}
    >
      <div data-testid="prose-canonical-block">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "var(--space-2, 8px)",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "var(--font-size-base, 14px)",
              color: "var(--color-text-primary, #111827)",
            }}
          >
            {heading}
          </h3>
          <div style={{ display: "flex", gap: "var(--space-1, 4px)" }}>
            <button
              type="button"
              data-testid="prose-copy"
              onClick={() => copyTextToClipboard(canonical)}
              style={btn_style()}
            >
              Copy
            </button>
            <button
              type="button"
              data-testid="prose-copy-markdown"
              onClick={() => copyTextToClipboard(proseToMarkdown(canonical, shape))}
              style={btn_style()}
            >
              Copy as Markdown
            </button>
            {shape !== "incomplete" ? (
              <button
                type="button"
                data-testid="prose-suggest-rewrite"
                onClick={() => aiSuggestion.invoke("G6", { canonical })}
                disabled={aiSuggestion.status === "invoking"}
                style={btn_style()}
              >
                ✦ Suggest rewrite
              </button>
            ) : null}
          </div>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: "var(--font-size-sm, 13px)",
            lineHeight: 1.65,
            color: "var(--color-text-primary, #111827)",
            whiteSpace: "pre-wrap",
          }}
        >
          {canonical}
        </p>
      </div>
      {rewritten ? (
        <div
          data-testid="prose-rewritten-block"
          style={{
            marginTop: "var(--space-4, 16px)",
            padding: "var(--space-3, 12px)",
            background: "var(--color-surface-pane-secondary, #fafafa)",
            borderRadius: "var(--border-radius-md, 6px)",
            border: "var(--border-thin) solid var(--color-border-tertiary)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2, 8px)",
              marginBottom: "var(--space-2, 8px)",
            }}
          >
            <h4
              style={{
                margin: 0,
                fontSize: "var(--font-size-sm, 13px)",
                color: "var(--color-text-secondary, #6b7280)",
              }}
            >
              Rewritten
            </h4>
            <span
              data-testid="ai-attribution-rewritten"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
                padding: "0 var(--space-1, 4px)",
                height: "var(--space-4, 16px)",
                borderRadius: "var(--radius-pill, 999px)",
                background: "var(--color-ai-accent-bg, #ede9fe)",
                color: "var(--color-ai-accent, #6d28d9)",
                fontSize: "var(--font-size-2xs, 10px)",
                fontWeight: 500,
              }}
              title="Rewritten by G6"
            >
              ✦ rewrite
            </span>
            <button
              type="button"
              data-testid="prose-copy-rewritten"
              onClick={() => copyTextToClipboard(rewritten)}
              style={btn_style()}
            >
              Copy rewritten
            </button>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "var(--font-size-xs, 11px)",
              lineHeight: 1.65,
              color: "var(--color-text-secondary, #6b7280)",
              whiteSpace: "pre-wrap",
            }}
          >
            {rewritten}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function btn_style(): React.CSSProperties {
  return {
    background: "transparent",
    border: "var(--border-thin) solid var(--color-border-tertiary)",
    borderRadius: "var(--border-radius-md, 6px)",
    color: "var(--color-text-secondary, #6b7280)",
    cursor: "pointer",
    fontSize: "var(--font-size-xs, 11px)",
    padding: "2px 8px",
  };
}
