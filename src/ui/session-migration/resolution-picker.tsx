import type { ReactElement } from "react";
import type { OrphanResolution } from "@/state";
import { SegmentedToggle } from "../primitives";

export interface ResolutionPickerProps {
  value: OrphanResolution["kind"];
  onChange: (kind: OrphanResolution["kind"]) => void;
  /**
   * When false, the Reattach option is hidden so the user can't commit a
   * reattach resolution with no target. The parent computes this from
   * `candidate.reattach_candidates.length > 0`.
   */
  reattach_available?: boolean;
}

// "no_op" is the data model's term for "keep the row, do nothing with
// it during migration"; the UI surfaces it as "Keep" so the user
// doesn't have to learn programming jargon.
const ALL_OPTIONS: ReadonlyArray<{ value: OrphanResolution["kind"]; label: string }> = [
  { value: "discard", label: "Discard" },
  { value: "reattach", label: "Reattach" },
  { value: "no_op", label: "Keep" },
];

export function ResolutionPicker(props: ResolutionPickerProps): ReactElement {
  const options =
    props.reattach_available === false
      ? ALL_OPTIONS.filter((o) => o.value !== "reattach")
      : ALL_OPTIONS;
  return (
    <div data-testid="resolution-picker">
      <SegmentedToggle options={options} value={props.value} onChange={props.onChange} />
    </div>
  );
}
