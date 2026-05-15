import * as React from "react";
import type { ReactElement } from "react";
import type { FrameId, FrameVersion, FrameVersionId, NodeRef } from "@/schema";
import { FrameCanvas, useLayoutResult } from "../canvas";
import { Button, Spinner } from "../primitives";
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
    <div
      data-testid="frame-preview-view"
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
    >
      <PreviewBanner version_number={version_number} kind="frame" />
      {result.status === "loading" ? (
        <div
          data-testid="frame-preview-loading"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            gap: "var(--space-2)",
            color: "var(--color-text-secondary)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          <Spinner size={16} />
          <span>Loading version {version_number}…</span>
        </div>
      ) : result.status === "error" ? (
        <div
          data-testid="frame-preview-error"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            gap: "var(--space-2)",
          }}
        >
          <div style={{ color: "var(--color-severity-error)", fontSize: "var(--font-size-sm)" }}>
            {result.error?.message ?? "Failed to load version"}
          </div>
          <Button variant="secondary" size="md" onClick={preview.exit}>
            Return to working version
          </Button>
        </div>
      ) : (
        <div style={{ flex: 1, position: "relative" }}>
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
