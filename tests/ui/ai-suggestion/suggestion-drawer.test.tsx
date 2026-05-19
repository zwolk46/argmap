// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { SuggestionDrawer } from "@/ui/ai-suggestion/suggestion-drawer";
import type { AiSuggestionStatus } from "@/ui/hooks/use-ai-suggestion";
import type { CommitPlan, ConfirmationDecision } from "@/llm-hooks";

const mockResolveSuggestion = vi.fn().mockResolvedValue(undefined);

const PENDING_DEFAULT = {
  hook_id: "g1-checkpoint-suggestion",
  parsed: "suggested text" as unknown,
  parse_status: "ok",
  model_id: "claude",
  provider_id: "anthropic",
  prompt_name: "p",
  prompt_version: "1.0",
  input_hash: "h",
  prompt_body_hash: "pb",
  rendered_prompt_hash: "pr",
  raw_response: "raw",
  generated_at: "2026-01-01T00:00:00Z",
};

let currentPending: typeof PENDING_DEFAULT = { ...PENDING_DEFAULT };

// §12 F-18: each test can override previewCommit by setting this. The
// default returns null so legacy tests that don't care about the preview
// continue to pass without setting up a plan.
let mockPreviewCommit: (decision: ConfirmationDecision<unknown>) => CommitPlan | null = () => null;

vi.mock("@/ui/hooks/use-ai-suggestion", () => ({
  useAiSuggestion: () => ({
    pending: currentPending,
    status: "awaiting_decision" as AiSuggestionStatus,
    invoke: vi.fn(),
    resolve: mockResolveSuggestion,
    dismiss: vi.fn().mockImplementation(() => mockResolveSuggestion({ kind: "rejected" })),
    previewCommit: (d: ConfirmationDecision<unknown>) => mockPreviewCommit(d),
  }),
}));

beforeEach(() => {
  currentPending = { ...PENDING_DEFAULT };
  mockPreviewCommit = () => null;
});

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

describe("SuggestionDrawer — CommitPlan preview (§12 F-18)", () => {
  it("hides the preview section when previewCommit returns null", () => {
    mockPreviewCommit = () => null;
    const { queryByTestId } = render(<SuggestionDrawer store_kind="frame" />);
    expect(queryByTestId("commit-plan-preview")).toBeFalsy();
  });

  it("shows an advisory-only message when the plan has no writes", () => {
    mockPreviewCommit = () => ({ writes: [], versioned: false });
    const { queryByTestId } = render(<SuggestionDrawer store_kind="frame" />);
    expect(queryByTestId("commit-plan-preview")).toBeTruthy();
    expect(queryByTestId("commit-plan-empty")).toBeTruthy();
  });

  it("renders grouped create_node and create_edge writes (G2 legal-mode shape)", () => {
    // Mirror g2-interpretation-suggestion in legal mode: 2 Interpretation
    // create_nodes + 2 INTERPRETED_AS create_edges + 2 Authority + 2 CITES.
    mockPreviewCommit = () => ({
      writes: [
        {
          op: "create_node",
          field_path: "nodes",
          value: { type: "Interpretation", statement: "Statement A" },
        },
        { op: "create_edge", field_path: "edges", value: { type: "INTERPRETED_AS" } },
        { op: "create_node", field_path: "nodes", value: { type: "Authority", label: "Auth A" } },
        { op: "create_edge", field_path: "edges", value: { type: "CITES" } },
        {
          op: "create_node",
          field_path: "nodes",
          value: { type: "Interpretation", statement: "Statement B" },
        },
        { op: "create_edge", field_path: "edges", value: { type: "INTERPRETED_AS" } },
        { op: "create_node", field_path: "nodes", value: { type: "Authority", label: "Auth B" } },
        { op: "create_edge", field_path: "edges", value: { type: "CITES" } },
      ],
      versioned: true,
    });
    const { getByTestId } = render(<SuggestionDrawer store_kind="frame" />);
    const groups = getByTestId("commit-plan-groups").textContent ?? "";
    // Group labels surface counts + types so the user sees the hidden writes.
    expect(groups).toMatch(/Create 2 Interpretation nodes/);
    expect(groups).toMatch(/Create 2 INTERPRETED_AS edges/);
    expect(groups).toMatch(/Create 2 Authority nodes/);
    expect(groups).toMatch(/Create 2 CITES edges/);
    // Human-readable previews appear under each group.
    expect(groups).toMatch(/Statement A/);
    expect(groups).toMatch(/Statement B/);
    expect(groups).toMatch(/Auth A/);
    // Versioned plans surface the "new version" notice.
    expect(getByTestId("commit-plan-versioned")).toBeTruthy();
  });

  it("singularizes group labels when count is 1", () => {
    mockPreviewCommit = () => ({
      writes: [
        {
          op: "create_node",
          field_path: "nodes",
          value: { type: "Interpretation", statement: "X" },
        },
      ],
      versioned: true,
    });
    const { getByTestId } = render(<SuggestionDrawer store_kind="frame" />);
    const text = getByTestId("commit-plan-groups").textContent ?? "";
    expect(text).toContain("Create 1 Interpretation node");
    // Plural form must not leak when count is 1.
    expect(text).not.toContain("Create 1 Interpretation nodes");
  });

  it("renders set/append writes with target id and field path", () => {
    mockPreviewCommit = () => ({
      writes: [
        { op: "set", target_node_id: "node-1", field_path: "statement", value: "new value" },
        { op: "append", target_node_id: "node-2", field_path: "history", value: { event: "x" } },
      ],
      versioned: false,
    });
    const { getByTestId } = render(<SuggestionDrawer store_kind="frame" />);
    const text = getByTestId("commit-plan-groups").textContent ?? "";
    expect(text).toMatch(/Update 1 field/);
    expect(text).toMatch(/Append to 1 field/);
    expect(text).toMatch(/node-1 · statement/);
    expect(text).toMatch(/node-2 · history/);
  });

  it("hides the preview when an in-progress structured edit fails to parse", () => {
    // Structured (non-string) parsed value drives the JSON branch in
    // handleEdit / preview_decision. Type invalid JSON, hit "Confirm edit",
    // the parser fails -> parse_error is set -> commit_plan is null ->
    // preview section disappears even though preview_commit would otherwise
    // produce a non-empty plan.
    currentPending = {
      ...PENDING_DEFAULT,
      parsed: { gaps: ["a", "b"] } as unknown,
    };
    mockPreviewCommit = () => ({
      writes: [
        {
          op: "create_node",
          field_path: "nodes",
          value: { type: "Interpretation", statement: "should-not-show-when-edit-broken" },
        },
      ],
      versioned: true,
    });
    const { getByTestId, queryByTestId } = render(<SuggestionDrawer store_kind="frame" />);
    // Preview renders before any edit.
    expect(queryByTestId("commit-plan-preview")).toBeTruthy();
    // Enter edit mode (no parse error yet — preview still shows).
    fireEvent.click(getByTestId("suggestion-edit"));
    expect(queryByTestId("commit-plan-preview")).toBeTruthy();
    // Type invalid JSON and hit Confirm edit; handleEdit sets parse_error.
    fireEvent.change(getByTestId("suggestion-edit-textarea"), {
      target: { value: "{not valid json" },
    });
    fireEvent.click(getByTestId("suggestion-edit"));
    expect(queryByTestId("suggestion-edit-parse-error")).toBeTruthy();
    expect(queryByTestId("commit-plan-preview")).toBeFalsy();
  });

  it("collapses groups beyond 6 items into '…and N more'", () => {
    const writes = Array.from({ length: 9 }, (_, i) => ({
      op: "create_node" as const,
      field_path: "nodes",
      value: { type: "Interpretation", statement: `Statement ${i}` },
    }));
    mockPreviewCommit = () => ({ writes, versioned: true });
    const { getByTestId } = render(<SuggestionDrawer store_kind="frame" />);
    const text = getByTestId("commit-plan-groups").textContent ?? "";
    expect(text).toMatch(/Create 9 Interpretation nodes/);
    expect(text).toMatch(/…and 3 more/);
  });
});
