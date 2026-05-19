// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAiSuggestion } from "@/ui/hooks/use-ai-suggestion";

const mockInvokeHook = vi.fn().mockResolvedValue(undefined);
const mockResolveSuggestion = vi.fn().mockResolvedValue(undefined);
const mockPreviewCommitFrame = vi.fn(() => null as unknown);
const mockPreviewCommitSession = vi.fn(() => null as unknown);

vi.mock("@/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state")>();
  return {
    ...actual,
    useFrameStore: vi.fn(
      (selector: (s: { pending_suggestion: unknown; suggestion_status: string }) => unknown) =>
        selector({ pending_suggestion: null, suggestion_status: "idle" }),
    ),
    useSessionStore: vi.fn(
      (selector: (s: { pending_suggestion: unknown; suggestion_status: string }) => unknown) =>
        selector({ pending_suggestion: null, suggestion_status: "idle" }),
    ),
    useRepository: vi.fn(() => ({
      frame_store: {
        getState: () => ({
          invokeHook: mockInvokeHook,
          resolveSuggestion: mockResolveSuggestion,
          previewCommit: mockPreviewCommitFrame,
        }),
      },
      session_store: {
        getState: () => ({
          invokeHook: mockInvokeHook,
          resolveSuggestion: mockResolveSuggestion,
          previewCommit: mockPreviewCommitSession,
        }),
      },
    })),
  };
});

describe("useAiSuggestion", () => {
  it("returns idle status initially", () => {
    const { result } = renderHook(() => useAiSuggestion("frame"));
    expect(result.current.status).toBe("idle");
    expect(result.current.pending).toBeNull();
  });

  it("calls frame_store.invokeHook when store_kind=frame", async () => {
    mockInvokeHook.mockClear();
    const { result } = renderHook(() => useAiSuggestion("frame"));
    await act(() => result.current.invoke("G1", {}));
    expect(mockInvokeHook).toHaveBeenCalledWith("G1", {});
  });

  it("calls session_store.invokeHook when store_kind=session", async () => {
    mockInvokeHook.mockClear();
    const { result } = renderHook(() => useAiSuggestion("session"));
    await act(() => result.current.invoke("G1", {}));
    expect(mockInvokeHook).toHaveBeenCalledWith("G1", {});
  });

  it("dismiss calls resolveSuggestion with rejected decision", async () => {
    mockResolveSuggestion.mockClear();
    const { result } = renderHook(() => useAiSuggestion("frame"));
    await act(() => result.current.dismiss());
    expect(mockResolveSuggestion).toHaveBeenCalledWith({ kind: "rejected" });
  });

  // §12 F-18.
  it("previewCommit routes to frame_store when store_kind=frame", () => {
    mockPreviewCommitFrame.mockClear();
    mockPreviewCommitFrame.mockReturnValue({ writes: [], versioned: false });
    const { result } = renderHook(() => useAiSuggestion("frame"));
    const plan = result.current.previewCommit({ kind: "accepted", final: "x" });
    expect(mockPreviewCommitFrame).toHaveBeenCalledWith({ kind: "accepted", final: "x" });
    expect(plan).toEqual({ writes: [], versioned: false });
  });

  it("previewCommit routes to session_store when store_kind=session", () => {
    mockPreviewCommitSession.mockClear();
    mockPreviewCommitSession.mockReturnValue({ writes: [], versioned: true });
    const { result } = renderHook(() => useAiSuggestion("session"));
    const plan = result.current.previewCommit({ kind: "accepted", final: "x" });
    expect(mockPreviewCommitSession).toHaveBeenCalledWith({ kind: "accepted", final: "x" });
    expect(plan).toEqual({ writes: [], versioned: true });
  });

  it("previewCommit returns null when store returns null", () => {
    mockPreviewCommitFrame.mockClear();
    mockPreviewCommitFrame.mockReturnValue(null);
    const { result } = renderHook(() => useAiSuggestion("frame"));
    expect(result.current.previewCommit({ kind: "accepted", final: "x" })).toBeNull();
  });
});
