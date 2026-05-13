// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  VersionHistoryPreviewProvider,
  useVersionHistoryPreview,
  VersionHistoryPreviewProviderMissingError,
} from "@/ui/version-history/preview-context";

const wrapper = ({ children }: { children: ReactNode }) => (
  <VersionHistoryPreviewProvider>{children}</VersionHistoryPreviewProvider>
);

describe("VersionHistoryPreviewProvider", () => {
  it("starts with state.kind = 'none'", () => {
    const { result } = renderHook(() => useVersionHistoryPreview(), { wrapper });
    expect(result.current.state.kind).toBe("none");
  });

  it("enterFramePreview transitions to frame kind", () => {
    const { result } = renderHook(() => useVersionHistoryPreview(), { wrapper });
    act(() => {
      result.current.enterFramePreview({
        frame_id: "f1",
        version_id: "v1",
        version_number: 3,
      });
    });
    expect(result.current.state).toEqual({
      kind: "frame",
      frame_id: "f1",
      version_id: "v1",
      version_number: 3,
    });
  });

  it("enterSessionPreview replaces a prior frame preview", () => {
    const { result } = renderHook(() => useVersionHistoryPreview(), { wrapper });
    act(() => {
      result.current.enterFramePreview({ frame_id: "f", version_id: "fv", version_number: 1 });
    });
    act(() => {
      result.current.enterSessionPreview({
        session_id: "s",
        version_id: "sv",
        version_number: 2,
      });
    });
    expect(result.current.state.kind).toBe("session");
  });

  it("exit() resets state to none", () => {
    const { result } = renderHook(() => useVersionHistoryPreview(), { wrapper });
    act(() => {
      result.current.enterFramePreview({ frame_id: "f", version_id: "v", version_number: 1 });
    });
    act(() => {
      result.current.exit();
    });
    expect(result.current.state.kind).toBe("none");
  });

  it("throws when used outside the provider", () => {
    expect(() => renderHook(() => useVersionHistoryPreview())).toThrow(
      VersionHistoryPreviewProviderMissingError,
    );
  });
});
