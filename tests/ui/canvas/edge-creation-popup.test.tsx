// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { EdgeCreationPopup } from "@/ui/canvas/edge-creation-popup";
import type { EdgeCreationCandidate } from "@/ui/canvas/edges/edge-validity";

const CANDIDATES: EdgeCreationCandidate[] = [
  { kind: "edge", edge_type: "DECOMPOSES_INTO", source: "n-src", target: "n-tgt" },
  { kind: "edge", edge_type: "LEADS_TO", source: "n-src", target: "n-tgt" },
];

describe("EdgeCreationPopup", () => {
  it("renders one button per candidate using candidateLabel", () => {
    const { getByTestId } = render(
      <EdgeCreationPopup
        open
        candidates={CANDIDATES}
        position={{ x: 100, y: 100 }}
        onChoose={() => {}}
        onDismiss={() => {}}
      />,
    );
    const popup = getByTestId("edge-creation-popup");
    const buttons = popup.querySelectorAll("button");
    expect(buttons).toHaveLength(CANDIDATES.length);
  });

  it("calls onChoose and onDismiss when clicking a candidate", () => {
    const onChoose = vi.fn();
    const onDismiss = vi.fn();
    const { getByTestId } = render(
      <EdgeCreationPopup
        open
        candidates={CANDIDATES}
        position={{ x: 100, y: 100 }}
        onChoose={onChoose}
        onDismiss={onDismiss}
      />,
    );
    const popup = getByTestId("edge-creation-popup");
    const firstBtn = popup.querySelectorAll("button")[0];
    fireEvent.click(firstBtn);
    expect(onChoose).toHaveBeenCalledWith(CANDIDATES[0]);
    expect(onDismiss).toHaveBeenCalled();
  });

  it("calls onDismiss on Escape key via document listener", () => {
    const onDismiss = vi.fn();
    render(
      <EdgeCreationPopup
        open
        candidates={CANDIDATES}
        position={{ x: 100, y: 100 }}
        onChoose={() => {}}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalled();
  });

  it("does not render when open=false", () => {
    const { queryByTestId } = render(
      <EdgeCreationPopup
        open={false}
        candidates={CANDIDATES}
        position={{ x: 100, y: 100 }}
        onChoose={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(queryByTestId("edge-creation-popup")).toBeNull();
  });
});
