// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { FrameTitle } from "@/ui/chrome/frame-title";

const mockApplyPatch = vi.fn();

vi.mock("@/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state")>();
  return {
    ...actual,
    useFrameStore: vi.fn((selector: (s: { frame: { title: string } | null }) => unknown) =>
      selector({ frame: { title: "My Frame" } }),
    ),
    useRepository: vi.fn(() => ({
      frame_store: {
        getState: () => ({ applyPatch: mockApplyPatch }),
      },
    })),
  };
});

describe("FrameTitle", () => {
  beforeEach(() => {
    mockApplyPatch.mockClear();
  });

  it("displays the frame title", () => {
    const { getByText } = render(<FrameTitle />);
    expect(getByText("My Frame")).toBeTruthy();
  });

  it("enters edit mode on click when not read_only", () => {
    const { getByText, queryByTestId } = render(<FrameTitle />);
    fireEvent.click(getByText("My Frame"));
    expect(queryByTestId("frame-title-input")).toBeTruthy();
  });

  it("does not enter edit mode when read_only", () => {
    const { getByText, queryByTestId } = render(<FrameTitle read_only />);
    fireEvent.click(getByText("My Frame"));
    expect(queryByTestId("frame-title-input")).toBeNull();
  });

  it("commits on Enter", () => {
    const { getByText, getByTestId } = render(<FrameTitle />);
    fireEvent.click(getByText("My Frame"));
    const input = getByTestId("frame-title-input");
    fireEvent.change(input, { target: { value: "New Title" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockApplyPatch).toHaveBeenCalledWith({
      kind: "metadata_edited",
      partial: { title: "New Title" },
    });
  });

  it("cancels on Escape and preserves original title", () => {
    const { getByText, getByTestId, queryByTestId } = render(<FrameTitle />);
    fireEvent.click(getByText("My Frame"));
    const input = getByTestId("frame-title-input");
    fireEvent.change(input, { target: { value: "Discard me" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(mockApplyPatch).not.toHaveBeenCalled();
    expect(queryByTestId("frame-title-input")).toBeNull();
  });
});
