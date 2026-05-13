import type { ReactElement } from "react";
import { useSessionStore } from "@/state";
import { PremisePool } from "./premise-pool";
import { SessionAuthorities } from "./session-authorities";
import { Pill } from "../../primitives";

export interface BottomPanelProps {
  is_expanded: boolean;
  on_toggle_expanded: () => void;
  operating_mode: "legal" | "general";
  on_highlight_on_canvas?: (node_ids: ReadonlyArray<string>) => void;
}

export function BottomPanel(props: BottomPanelProps): ReactElement {
  const { is_expanded, on_toggle_expanded, operating_mode, on_highlight_on_canvas } = props;
  const premise_count = useSessionStore((s) => s.session?.premises.length ?? 0);
  const authority_count = useSessionStore((s) => s.session?.session_authorities?.length ?? 0);

  if (!is_expanded) {
    return (
      <div
        data-testid="bottom-panel-collapsed"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "0 var(--space-4)",
          height: 32,
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-secondary)",
        }}
      >
        <button
          type="button"
          data-testid="bottom-panel-toggle"
          onClick={on_toggle_expanded}
          aria-label="Expand bottom panel"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-secondary)",
            padding: 0,
            borderRadius: "var(--radius-sm)",
          }}
        >
          <svg
            width={12}
            height={12}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M4 10l4-4 4 4" />
          </svg>
        </button>
        <Pill variant="status_open" data-testid="bottom-panel-premise-count">
          {premise_count} Premises
        </Pill>
        <Pill variant="neutral" data-testid="bottom-panel-authority-count">
          {authority_count} Authorities
        </Pill>
      </div>
    );
  }

  return (
    <div
      data-testid="bottom-panel-expanded"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 var(--space-4)",
          height: 32,
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-secondary)",
          letterSpacing: "var(--letter-spacing-wide)",
          textTransform: "uppercase",
          fontWeight: "var(--font-weight-medium)",
          borderBottom: "var(--border-hairline) solid var(--color-border-subtle)",
          background: "var(--color-surface-elevated)",
        }}
      >
        <span>Premise pool & Session authorities</span>
        <button
          type="button"
          data-testid="bottom-panel-toggle"
          onClick={on_toggle_expanded}
          aria-label="Collapse bottom panel"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-secondary)",
            padding: 0,
          }}
        >
          <svg
            width={12}
            height={12}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "3fr 2fr",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            borderRight: "var(--border-hairline) solid var(--color-border-subtle)",
            overflow: "hidden",
          }}
        >
          <PremisePool on_highlight_on_canvas={on_highlight_on_canvas} />
        </div>
        <SessionAuthorities
          operating_mode={operating_mode}
          on_highlight_on_canvas={on_highlight_on_canvas}
        />
      </div>
    </div>
  );
}
