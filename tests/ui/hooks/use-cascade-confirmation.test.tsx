// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCascadeConfirmation } from "@/ui/hooks/use-cascade-confirmation";
import type { FrameVersion, Node } from "@/schema";
import type { CascadeReport } from "@/runtime";

const BLANK_VERSION: FrameVersion = {
  id: "v-1",
  frame_id: "f-1",
  version_number: 1,
  nodes: [{ id: "n-1", type: "RootQuestion" }] as unknown as Node[],
  edges: [],
  created_at: "2026-01-01T00:00:00Z",
  is_milestone: false,
};

const MOCK_REPORT: CascadeReport = {
  cascade_nodes: [{ node_id: "n-2", reason: { kind: "orphaned_by_node", cause_node_id: "n-1" } }],
  cascade_edges: [],
};

const mockApplyPatch = vi.fn();

vi.mock("@/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state")>();
  return {
    ...actual,
    useFrameStore: vi.fn((selector: (s: { frame_version: FrameVersion | null }) => unknown) =>
      selector({ frame_version: BLANK_VERSION }),
    ),
    useRepository: vi.fn(() => ({
      frame_store: {
        getState: () => ({ applyPatch: mockApplyPatch }),
      },
    })),
    selectCascadeSummary: vi.fn(() => MOCK_REPORT),
  };
});

describe("useCascadeConfirmation", () => {
  it("starts in idle phase", () => {
    const { result } = renderHook(() => useCascadeConfirmation());
    expect(result.current.phase).toBe("idle");
    expect(result.current.summary).toBeNull();
  });

  it("transitions to confirming on request", () => {
    const { result } = renderHook(() => useCascadeConfirmation());
    act(() => result.current.request("n-1"));
    expect(result.current.phase).toBe("confirming");
    expect(result.current.node_id).toBe("n-1");
    expect(result.current.summary).toEqual(MOCK_REPORT);
  });

  it("dispatches applyPatch on confirm", () => {
    mockApplyPatch.mockClear();
    const { result } = renderHook(() => useCascadeConfirmation());
    act(() => result.current.request("n-1"));
    act(() => result.current.confirm());
    expect(mockApplyPatch).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "node_removed", node_id: "n-1" }),
    );
    expect(result.current.phase).toBe("idle");
  });

  it("returns to idle on cancel without dispatching", () => {
    mockApplyPatch.mockClear();
    const { result } = renderHook(() => useCascadeConfirmation());
    act(() => result.current.request("n-1"));
    act(() => result.current.cancel());
    expect(mockApplyPatch).not.toHaveBeenCalled();
    expect(result.current.phase).toBe("idle");
  });
});
