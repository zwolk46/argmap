// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import * as React from "react";
import type { ReactElement } from "react";

// Stub sonner so the test can observe the calls our wrapper makes against
// the sonner singleton without actually rendering the toaster surface.
// happy-dom + sonner's portal + animation timers don't compose well; this
// keeps the test focused on the contract our `useToast` exposes.
const sonnerCalls: Array<{ method: string; message: string; opts?: { duration: number } }> = [];
const dismissCalls: Array<string | number | undefined> = [];

vi.mock("sonner", () => {
  type Opts = { duration: number };
  let id = 0;
  function record(method: string) {
    return (message: string, opts?: Opts): number => {
      sonnerCalls.push({ method, message, opts });
      return ++id;
    };
  }
  return {
    Toaster: () => null,
    toast: {
      info: record("info"),
      success: record("success"),
      warning: record("warning"),
      error: record("error"),
      dismiss: (id?: string | number) => {
        dismissCalls.push(id);
      },
    },
  };
});

const { ToastProvider, useToast } = await import("@/ui/primitives/toast");

describe("ToastProvider + useToast (sonner-backed)", () => {
  beforeEach(() => {
    sonnerCalls.length = 0;
    dismissCalls.length = 0;
  });

  function makePusher(
    message: string,
    kind: "error" | "warning" | "info" | "success" = "info",
    duration_ms?: number,
  ) {
    function Pusher(): ReactElement | null {
      const { push } = useToast();
      React.useEffect(() => {
        push({ message, kind, duration_ms });
      }, [push]);
      return null;
    }
    return Pusher;
  }

  it("forwards push() to the matching sonner kind", () => {
    const Pusher = makePusher("Save failed", "error");
    render(
      <ToastProvider>
        <Pusher />
      </ToastProvider>,
    );
    expect(sonnerCalls).toHaveLength(1);
    expect(sonnerCalls[0].method).toBe("error");
    expect(sonnerCalls[0].message).toBe("Save failed");
  });

  it("uses the default 6000ms duration when duration_ms is omitted", () => {
    const Pusher = makePusher("default-duration");
    render(
      <ToastProvider>
        <Pusher />
      </ToastProvider>,
    );
    expect(sonnerCalls[0].opts?.duration).toBe(6000);
  });

  it("translates duration_ms=0 to Infinity (sticky toast)", () => {
    const Pusher = makePusher("sticky", "error", 0);
    render(
      <ToastProvider>
        <Pusher />
      </ToastProvider>,
    );
    expect(sonnerCalls[0].opts?.duration).toBe(Infinity);
  });

  it("forwards a custom duration_ms verbatim", () => {
    const Pusher = makePusher("temporary", "info", 1000);
    render(
      <ToastProvider>
        <Pusher />
      </ToastProvider>,
    );
    expect(sonnerCalls[0].opts?.duration).toBe(1000);
  });

  it("returns a string id from push() that can feed dismiss()", () => {
    function Pusher(): ReactElement | null {
      const { push, dismiss } = useToast();
      React.useEffect(() => {
        const id = push({ kind: "info", message: "x" });
        expect(typeof id).toBe("string");
        dismiss(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    render(
      <ToastProvider>
        <Pusher />
      </ToastProvider>,
    );
    expect(dismissCalls).toHaveLength(1);
  });

  it("maps each ToastKind to the corresponding sonner method", () => {
    const ErrPusher = makePusher("e", "error");
    const WarnPusher = makePusher("w", "warning");
    const SuccessPusher = makePusher("s", "success");
    const InfoPusher = makePusher("i", "info");
    render(
      <ToastProvider>
        <ErrPusher />
        <WarnPusher />
        <SuccessPusher />
        <InfoPusher />
      </ToastProvider>,
    );
    const methods = sonnerCalls.map((c) => c.method).sort();
    expect(methods).toEqual(["error", "info", "success", "warning"]);
  });
});
