import * as React from "react";
import type { ReactElement } from "react";
import { CaretRight } from "@phosphor-icons/react";
import { useFrameStore, useAppStateStore, useRepository } from "@/state";
import { selectValidationDrawer } from "@/state";
import { Pill, SeverityIcon } from "../../primitives";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "#components/ui/sheet";
import { cn } from "#lib/utils";
import { ValidationRow } from "./validation-row";
import { dismissalKeyFor, partitionByDismissal } from "./dismissed-warnings";

export interface ValidationDrawerProps {
  open: boolean;
  on_close: () => void;
  on_jump_to_node: (node_id: string) => void;
}

export function ValidationDrawer(props: ValidationDrawerProps): ReactElement {
  const { open, on_close, on_jump_to_node } = props;
  // Subscribe via narrow selectors — `useFrameStore((s) => s)` /
  // `useAppStateStore((s) => s)` re-render on every patch (drag, edit)
  // including ones that don't touch validation, which is the anti-pattern
  // frame-building-page explicitly avoids.
  const frame_version = useFrameStore((s) => s.frame_version);
  const validation = useFrameStore((s) => s.validation);
  const frame_id = useFrameStore((s) => s.frame?.id);
  const dismissed_warnings = useAppStateStore((s) => s.app_state.dismissed_warnings);
  const { app_state_store: app_store } = useRepository();

  const entries = React.useMemo(
    () =>
      selectValidationDrawer({
        frame_version,
        validation,
      } as Parameters<typeof selectValidationDrawer>[0]),
    [frame_version, validation],
  );
  const errors = entries.filter((e) => e.severity === "error");
  const warnings = entries.filter((e) => e.severity === "warning");

  const dismissed_keys = new Set<string>(Object.keys(dismissed_warnings ?? {}));

  const as_results = warnings.map((e) => ({
    rule_id: e.rule_id,
    severity: e.severity as "warning",
    message: e.message,
    node_id: e.node_id,
    edge_id: e.edge_id,
  }));

  // P0-20: pass frame_id so the partition key matches what the dismiss
  // onClick handlers below use. Falling back to "frame" when there's no
  // open frame is a safety net (the drawer shouldn't render in that
  // state anyway).
  const { active, dismissed } = partitionByDismissal(
    as_results,
    dismissed_keys,
    frame_id ?? "frame",
  );

  const [show_dismissed, set_show_dismissed] = React.useState(false);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) on_close();
      }}
    >
      <SheetContent
        side="bottom"
        aria-label="Frame issues"
        className="flex max-h-[min(48vh,480px)] flex-col p-0"
      >
        {/* Header */}
        <SheetHeader className="flex flex-row items-center gap-3 border-b border-border bg-card p-3">
          <SheetTitle className="text-sm font-semibold tracking-tight">Frame issues</SheetTitle>
          {errors.length > 0 && (
            <Pill variant="severity_error">
              <SeverityIcon severity="error" size={12} />
              {errors.length} error{errors.length !== 1 ? "s" : ""}
            </Pill>
          )}
          {warnings.length > 0 && (
            <Pill variant="severity_warning">
              <SeverityIcon severity="warning" size={12} />
              {warnings.length} warning{warnings.length !== 1 ? "s" : ""}
            </Pill>
          )}
          {/* Sheet provides its own close button (top right) */}
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-muted">
          {entries.length === 0 && (
            <div className="m-3 flex items-center justify-center gap-2 rounded-md p-6 text-center text-sm font-medium text-green-700 dark:text-green-400">
              <SeverityIcon severity="pass" size={14} />
              No validation issues
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div role="region" aria-label="Error messages">
              <h3 className="px-4 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Errors
              </h3>
              {/* §13 #17: row[role="listitem"] needs an enclosing role="list"
                  parent for valid ARIA semantics. */}
              <div role="list">
                {errors.map((e, i) => (
                  <ValidationRow
                    key={`${e.rule_id}-${i}`}
                    result={{
                      rule_id: e.rule_id,
                      severity: "error",
                      message: e.message,
                      node_id: e.node_id,
                      edge_id: e.edge_id,
                    }}
                    is_dismissed={false}
                    on_jump_to_node={on_jump_to_node}
                    on_dismiss={() => {}}
                    on_restore={() => {}}
                    frame_version={frame_version}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Active warnings */}
          {active.length > 0 && (
            <div role="region" aria-label="Warning messages">
              <h3 className="px-4 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Warnings
              </h3>
              <div role="list">
                {active.map((r, i) => (
                  <ValidationRow
                    key={`${r.rule_id}-${i}`}
                    result={r}
                    is_dismissed={false}
                    on_jump_to_node={on_jump_to_node}
                    on_dismiss={() => {
                      const key = dismissalKeyFor(r, frame_id ?? "frame");
                      app_store.getState().dismissWarning(key);
                    }}
                    on_restore={() => {}}
                    frame_version={frame_version}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Dismissed warnings */}
          {dismissed.length > 0 && (
            <div>
              {/* KEEP RAW: full-width accordion header with rotating chevron; bespoke layout, not the standard Button taxonomy. */}
              <div className="flex items-center gap-2 py-2 pl-0 pr-3">
                <button
                  type="button"
                  onClick={() => set_show_dismissed((v) => !v)}
                  aria-expanded={show_dismissed}
                  className="flex flex-1 cursor-pointer items-center gap-1 border-none bg-transparent px-3 py-2 text-left text-xs text-muted-foreground"
                >
                  <CaretRight
                    size={12}
                    className={cn(
                      "transition-transform",
                      show_dismissed ? "rotate-90" : "rotate-0",
                    )}
                  />
                  <span>Dismissed ({dismissed.length})</span>
                </button>
                {show_dismissed ? (
                  <button
                    type="button"
                    data-testid="validation-restore-all"
                    onClick={() => {
                      for (const r of dismissed) {
                        const key = dismissalKeyFor(r, frame_id ?? "frame");
                        app_store.getState().undismissWarning(key);
                      }
                    }}
                    className="cursor-pointer rounded-md border-none bg-transparent px-2 py-1 text-xs text-primary hover:bg-muted"
                  >
                    Restore all
                  </button>
                ) : null}
              </div>
              {show_dismissed &&
                dismissed.map((r, i) => (
                  <ValidationRow
                    key={`dismissed-${r.rule_id}-${i}`}
                    result={r}
                    is_dismissed={true}
                    on_jump_to_node={on_jump_to_node}
                    on_dismiss={() => {}}
                    on_restore={() => {
                      const key = dismissalKeyFor(r, frame_id ?? "frame");
                      app_store.getState().undismissWarning(key);
                    }}
                    frame_version={frame_version}
                  />
                ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
