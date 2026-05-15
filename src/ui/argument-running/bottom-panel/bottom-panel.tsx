import type { ReactElement } from "react";
import { useSessionStore } from "@/state";
import { PremisePool } from "./premise-pool";
import { SessionAuthorities } from "./session-authorities";
import { IconButton, Pill } from "../../primitives";
import { UIcon } from "../../primitives/uicon";

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
          background: "var(--color-surface-elevated)",
          borderTop: "var(--border-hairline) solid var(--color-border-subtle)",
        }}
      >
        <IconButton
          aria-label="Expand bottom panel"
          onClick={on_toggle_expanded}
          size="sm"
          data-testid="bottom-panel-toggle"
          title="Expand premises and authorities"
        >
          <UIcon name="angle-up" size={16} />
        </IconButton>
        <span className="argmap-section-heading">Premises &amp; authorities</span>
        <Pill variant="status_open" data-testid="bottom-panel-premise-count" size="xs">
          {premise_count} {premise_count === 1 ? "premise" : "premises"}
        </Pill>
        <Pill variant="neutral" data-testid="bottom-panel-authority-count" size="xs">
          {authority_count} {authority_count === 1 ? "authority" : "authorities"}
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
          borderBottom: "var(--border-hairline) solid var(--color-border-subtle)",
          background: "var(--color-surface-elevated)",
        }}
      >
        <span className="argmap-section-heading">Premises &amp; authorities</span>
        <IconButton
          aria-label="Collapse bottom panel"
          onClick={on_toggle_expanded}
          size="sm"
          data-testid="bottom-panel-toggle"
        >
          <UIcon name="angle-down" size={16} />
        </IconButton>
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
