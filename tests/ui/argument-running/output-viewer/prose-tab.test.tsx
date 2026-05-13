// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import {
  ProseTab,
  copyTextToClipboard,
  proseToMarkdown,
} from "@/ui/argument-running/output-viewer/prose-tab";
import type { OutputViewPayload } from "@/state";

vi.mock("@/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state")>();
  return {
    ...actual,
    useFrameStore: vi.fn((sel?: (s: object) => unknown) =>
      sel ? sel({ pending_suggestion: null, suggestion_status: "idle" }) : null,
    ),
    useSessionStore: vi.fn((sel?: (s: object) => unknown) =>
      sel ? sel({ pending_suggestion: null, suggestion_status: "idle" }) : null,
    ),
    useRepository: vi.fn(() => ({
      frame_store: { getState: () => ({ invokeHook: vi.fn(), resolveSuggestion: vi.fn() }) },
      session_store: { getState: () => ({ invokeHook: vi.fn(), resolveSuggestion: vi.fn() }) },
    })),
  };
});

describe("proseToMarkdown", () => {
  it("uses 'Conclusion' for determinate", () => {
    expect(proseToMarkdown("Body", "determinate")).toBe("## Conclusion\n\nBody");
  });
  it("uses 'Conditional conclusion' for conditional", () => {
    expect(proseToMarkdown("Body", "conditional")).toBe("## Conditional conclusion\n\nBody");
  });
  it("uses 'Contested' for contested", () => {
    expect(proseToMarkdown("Body", "contested")).toBe("## Contested\n\nBody");
  });
  it("uses 'Indeterminate' for incomplete", () => {
    expect(proseToMarkdown("Body", "incomplete")).toBe("## Indeterminate\n\nBody");
  });
});

describe("copyTextToClipboard", () => {
  it("calls navigator.clipboard.writeText when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { clipboard: { writeText } },
    });
    await copyTextToClipboard("hello");
    expect(writeText).toHaveBeenCalledWith("hello");
  });
});

describe("ProseTab", () => {
  it("renders the empty state when payload is null", () => {
    const { getByTestId } = render(<ProseTab payload={null} />);
    expect(getByTestId("prose-tab-empty")).toBeTruthy();
  });

  it("renders the canonical block when prose.canonical is present", () => {
    const payload: OutputViewPayload = {
      shape: "determinate",
      prose: { canonical: "The court should affirm." },
    };
    const { getByTestId } = render(<ProseTab payload={payload} />);
    expect(getByTestId("prose-canonical-block").textContent).toContain("The court should affirm.");
  });

  it("renders the rewritten block secondary to canonical when present", () => {
    const payload: OutputViewPayload = {
      shape: "determinate",
      prose: { canonical: "Canonical text", rewritten: "Polished text" },
    };
    const { getByTestId } = render(<ProseTab payload={payload} />);
    expect(getByTestId("prose-canonical-block")).toBeTruthy();
    expect(getByTestId("prose-rewritten-block").textContent).toContain("Polished text");
    expect(getByTestId("ai-attribution-rewritten")).toBeTruthy();
  });

  it("hides the suggest-rewrite button for incomplete shape", () => {
    const payload: OutputViewPayload = {
      shape: "incomplete",
      prose: { canonical: "Pending…" },
    };
    const { queryByTestId } = render(<ProseTab payload={payload} />);
    expect(queryByTestId("prose-suggest-rewrite")).toBeNull();
  });
});
