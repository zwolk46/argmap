import type { ReactElement } from "react";
import { useSessionStore } from "@/state";
import { PremisePool } from "./premise-pool";
import { SessionAuthorities } from "./session-authorities";

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
          gap: "var(--space-2, 8px)",
          padding: "var(--space-1, 4px) var(--space-3, 12px)",
          height: 32,
          fontSize: "var(--font-size-xs, 11px)",
          color: "var(--color-text-secondary, #6b7280)",
        }}
      >
        <button
          type="button"
          data-testid="bottom-panel-toggle"
          onClick={on_toggle_expanded}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-secondary, #6b7280)",
            fontSize: "12px",
            padding: 0,
          }}
          aria-label="Expand bottom panel"
        >
          ▴
        </button>
        <span data-testid="bottom-panel-premise-count">{premise_count} Premises</span>
        <span>·</span>
        <span data-testid="bottom-panel-authority-count">
          {authority_count} Session Authorities
        </span>
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
          padding: "var(--space-1, 4px) var(--space-3, 12px)",
          height: 32,
          fontSize: "var(--font-size-xs, 11px)",
          color: "var(--color-text-secondary, #6b7280)",
          borderBottom: "var(--border-thin) solid var(--color-border-tertiary)",
        }}
      >
        <span>Premise pool & Session authorities</span>
        <button
          type="button"
          data-testid="bottom-panel-toggle"
          onClick={on_toggle_expanded}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-secondary, #6b7280)",
            fontSize: "12px",
            padding: 0,
          }}
          aria-label="Collapse bottom panel"
        >
          ▾
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
            borderRight: "var(--border-thin) solid var(--color-border-tertiary)",
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
