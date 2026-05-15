import type { ReactElement } from "react";
import type { OrphanResolution } from "@/state";
import { SegmentedToggle } from "../primitives";

export interface ResolutionPickerProps {
  value: OrphanResolution["kind"];
  onChange: (kind: OrphanResolution["kind"]) => void;
}

// "no_op" is the data model's term for "keep the row, do nothing with
// it during migration"; the UI surfaces it as "Keep" so the user
// doesn't have to learn programming jargon.
const OPTIONS: ReadonlyArray<{ value: OrphanResolution["kind"]; label: string }> = [
  { value: "discard", label: "Discard" },
  { value: "reattach", label: "Reattach" },
  { value: "no_op", label: "Keep" },
];

export function ResolutionPicker(props: ResolutionPickerProps): ReactElement {
  return (
    <div data-testid="resolution-picker">
      <SegmentedToggle options={OPTIONS} value={props.value} onChange={props.onChange} />
    </div>
  );
}
