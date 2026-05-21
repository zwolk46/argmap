import type { ReactElement } from "react";
import { useSessionStore } from "@/state";
import { CaretUp, CaretDown } from "@phosphor-icons/react";
import { PremisePool } from "./premise-pool";
import { SessionAuthorities } from "./session-authorities";
import { Pill } from "../../primitives";
import { Button } from "#components/ui/button";

export interface BottomPanelProps {
  is_expanded: boolean;
  on_toggle_expanded: () => void;
  operating_mode: "legal" | "general";
  on_highlight_on_canvas?: (node_ids: ReadonlyArray<string>) => void;
}

// Note on the handoff's "shadcn Accordion for collapsible sections":
// the Premise Pool + Session Authorities pair in the expanded bottom panel
// was previously a 3fr/2fr side-by-side grid with a fixed 180px row height
// (set by `bottom_expanded_height` in two-pane-layout). Stacking the two
// surfaces inside an Accordion would (a) starve the lists of vertical
// space, (b) duplicate the "Premises" / "Session authorities" labels
// (Accordion trigger + inner pool header both render them), and (c) hide
// one section behind a collapse interaction that practitioners reading
// both lists at once would have to undo on every page entry. The expand /
// collapse toggle at the panel level still satisfies the "collapsible"
// goal. Side-by-side simultaneity is retained; Accordion is intentionally
// declined here.
export function BottomPanel(props: BottomPanelProps): ReactElement {
  const { is_expanded, on_toggle_expanded, operating_mode, on_highlight_on_canvas } = props;
  const premise_count = useSessionStore((s) => s.session?.premises.length ?? 0);
  const authority_count = useSessionStore((s) => s.session?.session_authorities?.length ?? 0);

  if (!is_expanded) {
    return (
      <div
        data-testid="bottom-panel-collapsed"
        className="flex items-center gap-3 border-t bg-background px-4 text-xs text-muted-foreground"
        style={{ height: "var(--height-row-toolbar)" }}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Expand bottom panel"
          onClick={on_toggle_expanded}
          data-testid="bottom-panel-toggle"
          title="Expand premises and authorities"
        >
          <CaretUp size={16} />
        </Button>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Premises &amp; authorities
        </span>
        <Pill
          variant={premise_count === 0 ? "neutral" : "status_open"}
          data-testid="bottom-panel-premise-count"
          size="xs"
        >
          {premise_count} {premise_count === 1 ? "premise" : "premises"}
        </Pill>
        <Pill
          variant={authority_count === 0 ? "neutral" : "mode_accent"}
          data-testid="bottom-panel-authority-count"
          size="xs"
        >
          {authority_count} {authority_count === 1 ? "authority" : "authorities"}
        </Pill>
      </div>
    );
  }

  return (
    <div data-testid="bottom-panel-expanded" className="flex h-full flex-col">
      <div
        className="flex items-center justify-between border-b bg-background px-4"
        style={{ height: "var(--height-row-toolbar)" }}
      >
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Premises &amp; authorities
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Collapse bottom panel"
          onClick={on_toggle_expanded}
          data-testid="bottom-panel-toggle"
        >
          <CaretDown size={16} />
        </Button>
      </div>
      <div className="grid flex-1 overflow-hidden" style={{ gridTemplateColumns: "3fr 2fr" }}>
        <div className="overflow-hidden border-r">
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
