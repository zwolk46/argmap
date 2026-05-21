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

  // Grid template uses inline style because the column/row sizes are
  // dynamic (props-driven). Tailwind grid utilities can't express
  // arbitrary template-row sizing that depends on bottom-row toggle.
  return (
    <div
      data-testid="argument-running-two-pane"
      className="grid h-full overflow-hidden"
      style={{
        gridTemplateColumns: `${left_width} 1fr`,
        gridTemplateRows: bottom != null ? `1fr ${bottom_row_h}` : "1fr",
      }}
    >
      <aside className="col-start-1 row-start-1 min-h-0 overflow-auto border-r bg-background">
        {left}
      </aside>
      {/* P5: outer <main id="main"> lives in app-routes.tsx so we don't nest
          <main> elements (invalid per HTML5). */}
      <div className="relative col-start-2 row-start-1 min-h-0 overflow-hidden bg-muted/30">
        {right}
      </div>
      {bottom != null && (
        <div
          className="col-span-2 row-start-2 overflow-hidden border-t bg-background transition-[height]"
          style={{ transitionDuration: "var(--duration-medium)" }}
        >
          {bottom}
        </div>
      )}
    </div>
  );
}
