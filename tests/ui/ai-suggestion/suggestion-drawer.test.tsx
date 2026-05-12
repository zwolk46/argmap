// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { SuggestionDrawer } from "@/ui/ai-suggestion/suggestion-drawer";
import type { AiSuggestionStatus } from "@/ui/hooks/use-ai-suggestion";

const mockResolveSuggestion = vi.fn().mockResolvedValue(undefined);

const PENDING = {
  hook_id: "g1-checkpoint-suggestion",
  parsed: "suggested text",
  parse_status: "ok",
  model_id: "claude",
  provider_id: "anthropic",
  prompt_name: "p",
  prompt_version: "1.0",
  input_hash: "h",
  raw_response: "raw",
  generated_at: "2026-01-01T00:00:00Z",
};

vi.mock("@/ui/hooks/use-ai-suggestion", () => ({
  useAiSuggestion: () => ({
    pending: PENDING,
    status: "awaiting_decision" as AiSuggestionStatus,
    invoke: vi.fn(),
    resolve: mockResolveSuggestion,
    dismiss: vi.fn().mockImplementation(() => mockResolveSuggestion({ kind: "rejected" })),
  }),
}));

describe("SuggestionDrawer", () => {
  it("renders when pending is non-null", () => {
    const { queryByTestId } = render(<SuggestionDrawer store_kind="frame" />);
    expect(queryByTestId("suggestion-preview")).toBeTruthy();
  });

  it("calls resolve with accepted when Accept is clicked", () => {
    mockResolveSuggestion.mockClear();
    const { getByTestId } = render(<SuggestionDrawer store_kind="frame" />);
    fireEvent.click(getByTestId("suggestion-accept"));
    expect(mockResolveSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "accepted" }),
    );
  });

  it("calls resolve with rejected when Reject is clicked", () => {
    mockResolveSuggestion.mockClear();
    const { getByTestId } = render(<SuggestionDrawer store_kind="frame" />);
    fireEvent.click(getByTestId("suggestion-reject"));
    expect(mockResolveSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "rejected" }),
    );
  });

  it("enters edit mode and shows textarea when Edit is clicked", () => {
    const { getByTestId, queryByTestId } = render(<SuggestionDrawer store_kind="frame" />);
    fireEvent.click(getByTestId("suggestion-edit"));
    expect(queryByTestId("suggestion-edit-textarea")).toBeTruthy();
  });
});
