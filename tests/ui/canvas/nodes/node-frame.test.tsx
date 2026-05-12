// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NodeFrame } from "@/ui/canvas/nodes/node-frame";
import type { NodeDisplayFlags } from "@/ui/canvas/nodes/types";
import type { HookInvocationRecord } from "@/llm-hooks";
import { TooltipProvider } from "@/ui/primitives/tooltip";

const DEFAULT_DISPLAY: NodeDisplayFlags = {
  selected: false,
  hovered: false,
  not_applicable_dim: false,
  foreclosed_strikethrough: false,
  recommended_next_pulse: false,
  indeterminate_gate_dashed: false,
};

const ATTRIBUTION: HookInvocationRecord = {
  id: "inv-1",
  hook_id: "G1",
  prompt_name: "p",
  prompt_version: "1.0",
  provider_id: "anthropic",
  model_id: "claude",
  input_hash: "h",
  decision: "accepted",
  invoked_at: "2026-01-01T00:00:00Z",
};

function renderFrame(props: Partial<React.ComponentProps<typeof NodeFrame>> = {}) {
  return render(
    <TooltipProvider>
      <NodeFrame
        node_id="n-1"
        node_type="RootQuestion"
        primary_text="Is this valid?"
        variant="root_question"
        display={DEFAULT_DISPLAY}
        enable_connector_handle={false}
        legal_mode={false}
        {...props}
      />
    </TooltipProvider>,
  );
}

describe("NodeFrame", () => {
  it("renders primary text", () => {
    const { getByText } = renderFrame();
    expect(getByText("Is this valid?")).toBeTruthy();
  });

  it("renders type icon", () => {
    const { container } = renderFrame();
    // TypeIcon renders some text glyph
    expect(container.textContent).toBeTruthy();
  });

  it("renders AI attribution chip when attributions is non-empty", () => {
    const { queryByTestId } = renderFrame({ attributions: [ATTRIBUTION] });
    expect(queryByTestId("ai-attribution-chip")).toBeTruthy();
  });

  it("does not render AI attribution chip when attributions is empty", () => {
    const { queryByTestId } = renderFrame({ attributions: [] });
    expect(queryByTestId("ai-attribution-chip")).toBeNull();
  });

  it("applies selected data-state when selected", () => {
    const { container } = renderFrame({ display: { ...DEFAULT_DISPLAY, selected: true } });
    expect(container.querySelector("[data-state~='selected']")).toBeTruthy();
  });

  it("renders connector handle indicator when enabled and hovered", () => {
    const { queryByTestId } = renderFrame({
      enable_connector_handle: true,
      display: { ...DEFAULT_DISPLAY, hovered: true },
    });
    expect(queryByTestId("connector-handle-indicator")).toBeTruthy();
  });
});
