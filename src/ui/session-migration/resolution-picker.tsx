import type { ReactElement } from "react";
import type { OrphanResolution } from "@/state";
import { SegmentedToggle } from "../primitives";

export interface ResolutionPickerProps {
  value: OrphanResolution["kind"];
  onChange: (kind: OrphanResolution["kind"]) => void;
}

const OPTIONS: ReadonlyArray<{ value: OrphanResolution["kind"]; label: string }> = [
  { value: "discard", label: "Discard" },
  { value: "reattach", label: "Reattach" },
  { value: "no_op", label: "Keep as no-op" },
];

export function ResolutionPicker(props: ResolutionPickerProps): ReactElement {
  return (
    <div data-testid="resolution-picker">
      <SegmentedToggle options={OPTIONS} value={props.value} onChange={props.onChange} />
    </div>
  );
}
