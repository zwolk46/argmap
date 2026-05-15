import type { ReactElement, ReactNode } from "react";

export interface TwoPaneLayoutProps {
  left: ReactNode;
  right: ReactNode;
  bottom?: ReactNode | null;
  left_width?: string;
  bottom_expanded_height?: string;
  bottom_expanded?: boolean;
}

export function TwoPaneLayout(props: TwoPaneLayoutProps): ReactElement {
  const {
    left,
    right,
    bottom = null,
    left_width = "280px",
    bottom_expanded_height = "180px",
    bottom_expanded = false,
  } = props;

  const bottom_row_h = bottom == null ? "0px" : bottom_expanded ? bottom_expanded_height : "32px";

  return (
    <div
      data-testid="argument-running-two-pane"
      style={{
        display: "grid",
        gridTemplateColumns: `${left_width} 1fr`,
        gridTemplateRows: bottom != null ? `1fr ${bottom_row_h}` : "1fr",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <aside
        style={{
          gridRow: "1",
          gridColumn: "1",
          background: "var(--color-surface-pane)",
          overflow: "auto",
          borderRight: "var(--border-hairline) solid var(--color-border-subtle)",
          minHeight: 0,
        }}
      >
        {left}
      </aside>
      {/* P5: outer <main id="main"> lives in app-routes.tsx so we don't nest
          <main> elements (invalid per HTML5). The right pane is the page's
          primary content region, but a plain <div> here matches the
          previous layout exactly and the parent <main> already exposes
          this as the main landmark. */}
      <div
        style={{
          gridRow: "1",
          gridColumn: "2",
          background: "var(--color-surface-elevated)",
          overflow: "hidden",
          position: "relative",
          minHeight: 0,
        }}
      >
        {right}
      </div>
      {bottom != null && (
        <div
          style={{
            gridRow: "2",
            gridColumn: "1 / -1",
            overflow: "hidden",
            background: "var(--color-surface-pane)",
            borderTop: "var(--border-hairline) solid var(--color-border-subtle)",
            boxShadow: "var(--shadow-sm)",
            transition: "height var(--duration-medium) var(--ease-emphasized)",
          }}
        >
          {bottom}
        </div>
      )}
    </div>
  );
}
