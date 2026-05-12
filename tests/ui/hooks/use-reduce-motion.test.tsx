// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReduceMotion } from "@/ui/hooks/use-reduce-motion";

describe("useReduceMotion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false when prefers-reduced-motion does not match", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    } as MediaQueryList));

    const { result } = renderHook(() => useReduceMotion());
    expect(result.current).toBe(false);
  });

  it("returns true when prefers-reduced-motion matches", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    } as MediaQueryList));

    const { result } = renderHook(() => useReduceMotion());
    expect(result.current).toBe(true);
  });

  it("updates when media query change event fires", () => {
    let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;

    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn((_, handler) => {
        changeHandler = handler as (e: MediaQueryListEvent) => void;
      }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    } as MediaQueryList));

    const { result } = renderHook(() => useReduceMotion());
    expect(result.current).toBe(false);

    act(() => {
      changeHandler?.({ matches: true } as MediaQueryListEvent);
    });

    expect(result.current).toBe(true);
  });
});
