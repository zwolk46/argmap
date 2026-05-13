// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import * as React from "react";
import type { ReactElement } from "react";
import { ToastProvider, useToast } from "@/ui/primitives/toast";

describe("ToastProvider + useToast", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  function makePusher(message: string, kind: "error" | "warning" | "info" | "success" = "info", duration_ms?: number) {
    function Pusher(): ReactElement | null {
      const { push } = useToast();
      React.useEffect(() => {
        push({ message, kind, duration_ms });
      }, [push]);
      return null;
    }
    return Pusher;
  }

  it("renders a pushed toast in the stack", () => {
    const Pusher = makePusher("Save failed", "error");
    const { getByText, getByTestId } = render(
      <ToastProvider>
        <Pusher />
      </ToastProvider>,
    );
    expect(getByText("Save failed")).toBeTruthy();
    expect(getByTestId("toast-error")).toBeTruthy();
  });

  it("error toasts have role=alert for screen readers", () => {
    const Pusher = makePusher("X", "error");
    const { getByRole } = render(
      <ToastProvider>
        <Pusher />
      </ToastProvider>,
    );
    const node = getByRole("alert");
    expect(node.textContent).toContain("X");
  });

  describe("with fake timers", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("auto-dismisses after duration_ms ticks", async () => {
      const Pusher = makePusher("temporary", "info", 1000);
      const { queryByText } = render(
        <ToastProvider>
          <Pusher />
        </ToastProvider>,
      );
      expect(queryByText("temporary")).toBeTruthy();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });
      expect(queryByText("temporary")).toBeNull();
    });

    it("sticky toast (duration_ms=0) remains until manually dismissed", async () => {
      const Pusher = makePusher("sticky", "error", 0);
      const { queryByText } = render(
        <ToastProvider>
          <Pusher />
        </ToastProvider>,
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(queryByText("sticky")).toBeTruthy();
    });
  });
});
