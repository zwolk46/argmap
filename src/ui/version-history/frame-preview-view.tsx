import * as React from "react";
import type { ReactElement } from "react";
import type { FrameId, FrameVersion, FrameVersionId, NodeRef } from "@/schema";
import { FrameCanvas, useLayoutResult } from "../canvas";
import { Button } from "#components/ui/button";
import { Spinner } from "../primitives";
import { PreviewBanner } from "./preview-banner";
import { useVersionFullLoad } from "./use-version-full-load";
import { useVersionHistoryPreview } from "./preview-context";

export interface FramePreviewViewProps {
  frame_id: FrameId;
  version_id: FrameVersionId;
  version_number: number;
}

const EMPTY_VERSION: FrameVersion = {
  id: "__empty__",
  frame_id: "__empty__",
  version_number: 0,
  created_at: "",
  nodes: [],
  edges: [],
  is_milestone: false,
};

export function FramePreviewView(props: FramePreviewViewProps): ReactElement {
  const { version_id, version_number } = props;
  const result = useVersionFullLoad({ kind: "frame", version_id });
  const preview = useVersionHistoryPreview();
  const [selected, setSelected] = React.useState<ReadonlyArray<NodeRef>>([]);

  const loaded_version =
    result.status === "ready" && result.version && "nodes" in result.version
      ? (result.version as FrameVersion)
      : EMPTY_VERSION;
  const layout_status = useLayoutResult(loaded_version);
  const layout_result =
    layout_status.kind === "ready"
      ? layout_status.result
      : layout_status.kind === "computing" || layout_status.kind === "error"
        ? layout_status.previous_result
        : null;

  return (
    <div data-testid="frame-preview-view" className="flex h-screen flex-col">
      <PreviewBanner version_number={version_number} kind="frame" />
      {result.status === "loading" ? (
        <div
          data-testid="frame-preview-loading"
          role="status"
          aria-live="polite"
          className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <Spinner size={16} decorative />
          <span>Loading version {version_number}…</span>
        </div>
      ) : result.status === "error" ? (
        <div
          data-testid="frame-preview-error"
          className="flex flex-1 flex-col items-center justify-center gap-2"
        >
          <div className="text-sm" style={{ color: "var(--color-severity-error)" }}>
            {result.error?.message ?? "Failed to load version"}
          </div>
          <Button variant="outline" size="default" onClick={preview.exit}>
            Return to working version
          </Button>
        </div>
      ) : (
        <div className="relative flex-1">
          <FrameCanvas
            frame_version={loaded_version}
            layout_result={layout_result}
            operating_mode="frame_building"
            read_only={true}
            foreclosure_visibility="visible"
            selection={selected}
            onSelectionChange={setSelected}
          />
        </div>
      )}
    </div>
  );
}
