// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "@/ui/hooks/use-keyboard-shortcuts";

function fireKey(key: string, target?: EventTarget) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true });
  if (target) {
    Object.defineProperty(event, "target", { value: target });
  }
  document.dispatchEvent(event);
}

describe("useKeyboardShortcuts", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fires onZoomIn for + key", () => {
    const onZoomIn = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onZoomIn }));
    fireKey("+");
    expect(onZoomIn).toHaveBeenCalled();
  });

  it("fires onZoomOut for - key", () => {
    const onZoomOut = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onZoomOut }));
    fireKey("-");
    expect(onZoomOut).toHaveBeenCalled();
  });

  it("fires onFitScreen for f key", () => {
    const onFitScreen = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onFitScreen }));
    fireKey("f");
    expect(onFitScreen).toHaveBeenCalled();
  });

  it("fires onCloseOverlay for Escape", () => {
    const onCloseOverlay = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onCloseOverlay }));
    fireKey("Escape");
    expect(onCloseOverlay).toHaveBeenCalled();
  });

  it("ignores events when target is an input element", () => {
    const onZoomIn = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onZoomIn }));
    const input = document.createElement("input");
    document.body.appendChild(input);
    const event = new KeyboardEvent("keydown", { key: "+", bubbles: true });
    Object.defineProperty(event, "target", { value: input });
    document.dispatchEvent(event);
    expect(onZoomIn).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("ignores events when target is a textarea", () => {
    const onZoomIn = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onZoomIn }));
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    const event = new KeyboardEvent("keydown", { key: "+", bubbles: true });
    Object.defineProperty(event, "target", { value: textarea });
    document.dispatchEvent(event);
    expect(onZoomIn).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it("allows rebinding zoom_in to a custom key", () => {
    const onZoomIn = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onZoomIn }, { zoom_in: "=" }));
    fireKey("=");
    expect(onZoomIn).toHaveBeenCalled();
  });

  it("removes listener on unmount", () => {
    const onZoomIn = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ onZoomIn }));
    unmount();
    fireKey("+");
    expect(onZoomIn).not.toHaveBeenCalled();
  });
});
