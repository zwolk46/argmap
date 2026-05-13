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
      <div
        style={{
          gridRow: "1",
          gridColumn: "1",
          background: "var(--color-surface-pane)",
          overflow: "auto",
          borderRight: "var(--border-thin) solid var(--color-border-tertiary)",
        }}
      >
        {left}
      </div>
      <div
        style={{
          gridRow: "1",
          gridColumn: "2",
          background: "var(--color-surface-elevated)",
          overflow: "hidden",
          position: "relative",
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
            borderTop: "var(--border-thin) solid var(--color-border-tertiary)",
          }}
        >
          {bottom}
        </div>
      )}
    </div>
  );
}
