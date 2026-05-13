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
    left_width = "240px",
    right_width = "360px",
    bottom_height = "200px",
  } = props;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${left_width} 1fr ${right_width}`,
        gridTemplateRows: bottom ? `1fr ${bottom_height}` : "1fr",
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
        }}
      >
        {left}
      </div>
      <div
        style={{
          gridRow: "1",
          gridColumn: "2",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {center}
      </div>
      <div
        style={{
          gridRow: "1",
          gridColumn: "3",
          overflow: "auto",
        }}
      >
        {right}
      </div>
      {bottom && (
        <div
          style={{
            gridRow: "2",
            gridColumn: "1 / -1",
            overflow: "auto",
          }}
        >
          {bottom}
        </div>
      )}
    </div>
  );
}
