import type { ReactElement, ReactNode } from "react";

export interface ThreePaneLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  bottom?: ReactNode | null;
  left_width?: string;
  right_width?: string;
  bottom_height?: string;
}

export function ThreePaneLayout(props: ThreePaneLayoutProps): ReactElement {
  const {
    left,
    center,
    right,
    bottom = null,
    left_width = "256px",
    right_width = "360px",
    bottom_height = "220px",
  } = props;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${left_width} 1fr ${right_width}`,
        gridTemplateRows: bottom ? `1fr ${bottom_height}` : "1fr",
        height: "100%",
        overflow: "hidden",
        background: "var(--color-surface-canvas)",
      }}
    >
      <aside
        style={{
          gridRow: "1",
          gridColumn: "1",
          background: "var(--color-surface-pane)",
          borderRight: "var(--border-hairline) solid var(--color-border-subtle)",
          overflow: "auto",
          minHeight: 0,
        }}
      >
        {left}
      </aside>
      {/* P5: outer <main id="main"> lives in app-routes.tsx so the skip-link
          target is defined once. The center pane is a region inside that
          main, not a separate landmark; <section role="region"> would be
          semantically the most accurate but a plain <div> matches the
          previous layout exactly and the parent <main> already announces
          this region as primary content. */}
      <div
        style={{
          gridRow: "1",
          gridColumn: "2",
          overflow: "hidden",
          position: "relative",
          background: "var(--color-surface-canvas)",
          minHeight: 0,
        }}
      >
        {center}
      </div>
      <aside
        style={{
          gridRow: "1",
          gridColumn: "3",
          overflow: "auto",
          background: "var(--color-surface-pane)",
          borderLeft: "var(--border-hairline) solid var(--color-border-subtle)",
          minHeight: 0,
        }}
      >
        {right}
      </aside>
      {bottom ? (
        <div
          style={{
            gridRow: "2",
            gridColumn: "1 / -1",
            overflow: "hidden",
            background: "var(--color-surface-pane)",
            borderTop: "var(--border-hairline) solid var(--color-border-subtle)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {bottom}
        </div>
      ) : null}
    </div>
  );
}
