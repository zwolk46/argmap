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
      className="grid h-full overflow-hidden bg-background"
      style={{
        gridTemplateColumns: `${left_width} 1fr ${right_width}`,
        gridTemplateRows: bottom ? `1fr ${bottom_height}` : "1fr",
      }}
    >
      <aside className="col-start-1 row-start-1 min-h-0 overflow-auto border-r border-border bg-card">
        {left}
      </aside>
      {/* P5: outer <main id="main"> lives in app-routes.tsx so the skip-link
          target is defined once. The center pane is a region inside that
          main, not a separate landmark; <section role="region"> would be
          semantically the most accurate but a plain <div> matches the
          previous layout exactly and the parent <main> already announces
          this region as primary content. */}
      <div className="relative col-start-2 row-start-1 min-h-0 overflow-hidden bg-background">
        {center}
      </div>
      <aside className="col-start-3 row-start-1 min-h-0 overflow-auto border-l border-border bg-card">
        {right}
      </aside>
      {bottom ? (
        <div className="col-span-3 col-start-1 row-start-2 overflow-hidden border-t border-border bg-card shadow-sm">
          {bottom}
        </div>
      ) : null}
    </div>
  );
}
