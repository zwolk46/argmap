import * as React from "react";
import type { ReactElement } from "react";
import type {
  NodeRef,
  Mode,
  Flavor,
  Position,
  ConclusionDirection,
} from "@/schema";
import { useFrameStore, useRepository, type ConclusionDirectionResolution } from "@/state";
import { Dialog, DialogHeader, DialogBody, DialogFooter, Button } from "../primitives";
import { TargetModePicker } from "./target-mode-picker";
import { PositionsInlineEditor } from "./positions-inline-editor";
import { ScanResultBody } from "./scan-result-body";
import { useModeChangeScan } from "./use-mode-change-scan";
import { buildModeChangeSummary } from "./change-summary";

export interface ArchitecturalModeChangeDialogProps {
  open: boolean;
  onClose: () => void;
  target: "mode" | "flavor";
  focus_node_id?: NodeRef;
}

export function ArchitecturalModeChangeDialog(
  props: ArchitecturalModeChangeDialogProps,
): ReactElement | null {
  const { open, onClose } = props;
  const frame = useFrameStore((s) => s.frame);
  const current_version = useFrameStore((s) => s.frame_version);
  const { generateId, frame_store } = useRepository();

  const current_mode: Mode = (frame?.mode ?? "general") as Mode;
  const current_flavor: Flavor | undefined = frame?.flavor;
  const initial_target_mode: Mode = current_mode === "legal" ? "general" : "legal";
  const initial_target_flavor: Flavor | undefined =
    initial_target_mode === "general" ? "personal" : undefined;

  const [target_mode, setTargetMode] = React.useState<Mode>(initial_target_mode);
  const [target_flavor, setTargetFlavor] = React.useState<Flavor | undefined>(
    initial_target_flavor,
  );
  const [staged_positions, setStagedPositions] = React.useState<Position[]>([]);
  const [direction_resolutions, setDirectionResolutions] = React.useState<
    Map<NodeRef, ConclusionDirection>
  >(new Map());
  const [committing, setCommitting] = React.useState(false);

  // Reset on open transition.
  const last_open_ref = React.useRef(false);
  React.useEffect(() => {
    if (open && !last_open_ref.current) {
      setTargetMode(initial_target_mode);
      setTargetFlavor(initial_target_flavor);
      setStagedPositions([]);
      setDirectionResolutions(new Map());
      setCommitting(false);
    }
    last_open_ref.current = open;
  }, [open, initial_target_mode, initial_target_flavor]);

  const current_positions: Position[] = frame?.positions ?? [];

  const scan = useModeChangeScan({
    current_version: current_version ?? EMPTY_FRAME_VERSION,
    current_mode,
    current_flavor,
    target_mode,
    target_flavor,
    current_positions,
    staged_positions,
  });

  if (!open || !frame || !current_version) return null;
  if (props.target !== "mode") return null;

  const inline_editors = scan.result.inline_editors ?? [];

  const conclusion_title_by_id = new Map<NodeRef, string>();
  for (const n of current_version.nodes) {
    if (n.type === "Conclusion") {
      conclusion_title_by_id.set(n.id as NodeRef, n.statement ?? n.id);
    }
  }

  const has_conclusions = current_version.nodes.some((n) => n.type === "Conclusion");
  const need_positions =
    target_mode === "general" && has_conclusions && current_positions.length === 0;
  const has_positions = !need_positions || staged_positions.length > 0;
  const all_resolved = inline_editors.every((e) =>
    direction_resolutions.has(e.node_id as NodeRef),
  );
  const flavor_ok = target_mode === "legal" || target_flavor !== undefined;
  const can_commit = !committing && has_positions && all_resolved && flavor_ok;

  function onPositionStaged(p: Position): void {
    setStagedPositions((prev) => [...prev, p]);
    scan.rescan();
  }
  function onPositionRemoved(id: string): void {
    setStagedPositions((prev) => prev.filter((p) => p.id !== id));
    scan.rescan();
  }
  function onResolutionChanged(node_id: NodeRef, direction: ConclusionDirection): void {
    setDirectionResolutions((prev) => {
      const next = new Map(prev);
      next.set(node_id, direction);
      return next;
    });
  }

  async function handleCommit(): Promise<void> {
    setCommitting(true);
    const conclusion_direction_resolutions: ConclusionDirectionResolution[] = [];
    for (const [node_id, direction] of [...direction_resolutions.entries()].sort((a, b) =>
      a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0,
    )) {
      conclusion_direction_resolutions.push({ node_id, direction });
    }
    const change_summary = buildModeChangeSummary(
      current_mode,
      current_flavor,
      target_mode,
      target_flavor,
    );
    frame_store.getState().applyPatch({
      kind: "architectural_mode_changed",
      target_mode,
      target_flavor,
      positions_added: staged_positions.length > 0 ? staged_positions : undefined,
      conclusion_direction_resolutions,
      change_summary,
    });
    setCommitting(false);
    onClose();
  }

  const available_positions: Position[] = [...current_positions, ...staged_positions];

  return (
    <Dialog open={true} onClose={onClose} aria_label="Change architectural mode" size="lg">
      <DialogHeader>Change architectural mode</DialogHeader>
      <DialogBody>
        <TargetModePicker
          current_mode={current_mode}
          current_flavor={current_flavor}
          target_mode={target_mode}
          target_flavor={target_flavor}
          onTargetFlavorChanged={(f) => setTargetFlavor(f)}
        />
        {need_positions ? (
          <PositionsInlineEditor
            staged_positions={staged_positions}
            onPositionStaged={onPositionStaged}
            onPositionRemoved={onPositionRemoved}
            generateId={generateId}
          />
        ) : null}
        <ScanResultBody
          blocking={scan.result.blocking}
          advisory={scan.result.advisory}
          inline_editors={inline_editors}
          direction_resolutions={direction_resolutions}
          onResolutionChanged={onResolutionChanged}
          conclusion_title_by_id={conclusion_title_by_id}
          available_positions={target_mode === "general" ? available_positions : undefined}
        />
      </DialogBody>
      <DialogFooter>
        <Button
          variant="secondary"
          data-testid="mode-change-cancel"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          data-testid="mode-change-commit"
          disabled={!can_commit}
          onClick={handleCommit}
        >
          Commit mode change
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

import type { FrameVersion } from "@/schema";
const EMPTY_FRAME_VERSION: FrameVersion = {
  id: "__empty__",
  frame_id: "__empty__",
  version_number: 0,
  created_at: "",
  nodes: [],
  edges: [],
  is_milestone: false,
};
