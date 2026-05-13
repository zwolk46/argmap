import * as React from "react";
import type { ReactElement } from "react";
import type { FrameVersionId, SessionVersionId } from "@/schema";
import type { FrameVersionSummary, ArgumentSessionVersionSummary } from "@/state";
import { VersionTreeRow } from "./version-tree-row";
import { buildVersionTreeShape, filterByMilestone } from "./version-tree-shape";
import type { MilestoneFilterValue } from "./milestone-filter";
import { useReduceMotion } from "../hooks";

export type VersionTreeEntityKind = "frame" | "session";

export interface VersionTreeProps {
  entity_kind: VersionTreeEntityKind;
  summaries: ReadonlyArray<FrameVersionSummary | ArgumentSessionVersionSummary>;
  current_version_id: FrameVersionId | SessionVersionId | null;
  selected_version_id: FrameVersionId | SessionVersionId | null;
  on_select: (version_id: FrameVersionId | SessionVersionId) => void;
  milestone_filter: MilestoneFilterValue;
  session_authored_against_version_id?: FrameVersionId;
}

export function VersionTree(props: VersionTreeProps): ReactElement {
  const {
    entity_kind,
    summaries,
    current_version_id,
    selected_version_id,
    on_select,
    milestone_filter,
    session_authored_against_version_id,
  } = props;
  const reduce_motion = useReduceMotion();

  const display_entries = React.useMemo(() => {
    const filtered =
      milestone_filter === "milestones_only" ? filterByMilestone(summaries) : summaries;
    return buildVersionTreeShape(filtered);
  }, [summaries, milestone_filter]);

  const current_row_ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!current_version_id || !current_row_ref.current) return;
    try {
      current_row_ref.current.scrollIntoView({
        block: "center",
        behavior: reduce_motion ? "auto" : "smooth",
      });
    } catch {
      // jsdom / happy-dom may not implement; safe to ignore.
    }
  }, [current_version_id, reduce_motion]);

  if (display_entries.length === 0) {
    const empty_msg =
      entity_kind === "session"
        ? "No session milestones yet."
        : "No milestones yet — save one to mark a meaningful waypoint.";
    return (
      <div
        data-testid="version-tree-empty"
        style={{
          padding: "var(--space-4, 16px)",
          color: "var(--color-text-tertiary, #9ca3af)",
          fontSize: "var(--font-size-sm, 13px)",
          fontStyle: "italic",
        }}
      >
        {empty_msg}
      </div>
    );
  }

  return (
    <div
      role="list"
      data-testid="version-tree"
      style={{ display: "flex", flexDirection: "column" }}
    >
      {display_entries.map((entry) => {
        const is_current = entry.summary.id === current_version_id;
        const is_authored_against =
          entity_kind === "session" &&
          session_authored_against_version_id !== undefined &&
          entry.summary.id === session_authored_against_version_id;
        return (
          <div
            key={entry.summary.id}
            role="listitem"
            ref={is_current ? current_row_ref : undefined}
          >
            <VersionTreeRow
              summary={entry.summary}
              depth={entry.depth}
              is_current={is_current}
              is_milestone={entry.summary.is_milestone}
              is_authored_against={is_authored_against}
              is_selected={entry.summary.id === selected_version_id}
              on_select={(id) => on_select(id as FrameVersionId | SessionVersionId)}
            />
          </div>
        );
      })}
    </div>
  );
}
