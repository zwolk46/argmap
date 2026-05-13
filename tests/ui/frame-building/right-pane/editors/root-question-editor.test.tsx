// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import type { RootQuestion } from "@/schema";
import type { FrameStoreSnapshot } from "@/state";

const mockApplyPatch = vi.fn();

vi.mock("@/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state")>();
  return {
    ...actual,
    useFrameStore: vi.fn((selector: (s: Partial<FrameStoreSnapshot>) => unknown) =>
      selector({
        frame: { id: "f1", mode: "general" } as FrameStoreSnapshot["frame"],
        frame_version: null,
        validation: [],
        is_loading: false,
        error: null,
        pending_suggestion: null,
        suggestion_status: "idle",
      }),
    ),
    useRepository: vi.fn(() => ({
      frame_store: {
        getState: () => ({ applyPatch: mockApplyPatch }),
      },
    })),
  };
});

import { RootQuestionEditor } from "@/ui/frame-building/right-pane/editors/root-question-editor";

const mockNode: RootQuestion = {
  id: "n1",
  type: "RootQuestion",
  statement: "Is X true?",
} as RootQuestion;

describe("RootQuestionEditor", () => {
  beforeEach(() => {
    mockApplyPatch.mockClear();
  });

  it("renders the statement text", () => {
    const { getByDisplayValue } = render(<RootQuestionEditor node={mockNode} />);
    expect(getByDisplayValue("Is X true?")).toBeTruthy();
  });

  it("renders the 'Question' label", () => {
    const { getByText } = render(<RootQuestionEditor node={mockNode} />);
    expect(getByText("Question")).toBeTruthy();
  });

  it("blur on statement textarea dispatches a node_edited patch", () => {
    const { getByDisplayValue } = render(<RootQuestionEditor node={mockNode} />);
    const textarea = getByDisplayValue("Is X true?") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Is Y true?" } });
    fireEvent.blur(textarea);
    expect(mockApplyPatch).toHaveBeenCalledWith({
      kind: "node_edited",
      node_id: "n1",
      partial: { statement: "Is Y true?" },
    });
  });

  it("does not render standard of review field in general mode", () => {
    const { queryByText } = render(<RootQuestionEditor node={mockNode} />);
    expect(queryByText("Standard of Review")).toBeNull();
  });
});
