import type { ReactElement } from "react";
import type { NodeRef, FrameVersion } from "@/schema";
import type { InterviewItem } from "@/state";
import { InterviewRow } from "./interview-row";

export interface InterviewListProps {
  jurisdictional_items: ReadonlyArray<InterviewItem>;
  merits_items: ReadonlyArray<InterviewItem>;
  selected_item_id: NodeRef | null;
  recommended_next_id: NodeRef | null;
  on_select_item: (id: NodeRef) => void;
  frame_version: FrameVersion;
}

export function InterviewList(props: InterviewListProps): ReactElement {
  const {
    jurisdictional_items,
    merits_items,
    selected_item_id,
    recommended_next_id,
    on_select_item,
    frame_version,
  } = props;

  return (
    <div data-testid="interview-list" style={{ display: "flex", flexDirection: "column" }}>
      {jurisdictional_items.length > 0 ? (
        <>
          <SectionHeader label="Jurisdictional questions" />
          {jurisdictional_items.map((item) => (
            <InterviewRow
              key={item.node_id}
              item={item}
              selected={selected_item_id === item.node_id}
              recommended_next={recommended_next_id === item.node_id}
              on_click={() => on_select_item(item.node_id)}
              frame_version={frame_version}
            />
          ))}
        </>
      ) : null}
      {merits_items.length > 0 ? (
        <>
          <SectionHeader label="Merits" />
          {merits_items.map((item) => (
            <InterviewRow
              key={item.node_id}
              item={item}
              selected={selected_item_id === item.node_id}
              recommended_next={recommended_next_id === item.node_id}
              on_click={() => on_select_item(item.node_id)}
              frame_version={frame_version}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

function SectionHeader({ label }: { label: string }): ReactElement {
  return (
    <h3
      className="argmap-section-heading"
      style={{
        padding: "var(--space-1) var(--space-2)",
        background: "var(--color-surface-pane-secondary)",
      }}
    >
      {label}
    </h3>
  );
}
