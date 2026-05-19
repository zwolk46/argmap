// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import {
  ProseTab,
  copyTextToClipboard,
  proseToMarkdown,
} from "@/ui/argument-running/output-viewer/prose-tab";
import type { OutputViewPayload } from "@/state";
import type { HookInvocationRecord } from "@/schema";

// Shared captures so individual tests can read what useAiSuggestion's
// underlying store calls saw.
const session_invokeHook = vi.fn();
let ai_hooks_enabled_override = false;

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
      frame_store: {
        getState: () => ({ invokeHook: vi.fn(), resolveSuggestion: vi.fn(), frame: null }),
      },
      session_store: {
        getState: () => ({ invokeHook: session_invokeHook, resolveSuggestion: vi.fn() }),
      },
      ai_hooks_enabled: ai_hooks_enabled_override,
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
    // §12 F-22: rewrite header now renders the shared AiAttributionChip.
    expect(getByTestId("ai-attribution-chip")).toBeTruthy();
  });

  it("hides the suggest-rewrite button for incomplete shape", () => {
    const payload: OutputViewPayload = {
      shape: "incomplete",
      prose: { canonical: "Pending…" },
    };
    const { queryByTestId } = render(<ProseTab payload={payload} />);
    expect(queryByTestId("prose-suggest-rewrite")).toBeNull();
  });

  describe("§12 F-09 attribution + F-10 baseline choice (ai_hooks_enabled)", () => {
    beforeEach(() => {
      ai_hooks_enabled_override = true;
      session_invokeHook.mockReset();
    });

    afterEach(() => {
      ai_hooks_enabled_override = false;
    });

    it("renders the single 'Suggest rewrite' button when no rewrite exists yet", () => {
      const payload: OutputViewPayload = {
        shape: "determinate",
        prose: { canonical: "Canonical text" },
      };
      const { getByTestId, queryByTestId } = render(<ProseTab payload={payload} />);
      expect(getByTestId("prose-suggest-rewrite")).toBeTruthy();
      expect(queryByTestId("prose-refine-rewrite")).toBeNull();
      expect(queryByTestId("prose-rewrite-from-canonical")).toBeNull();
    });

    it("renders two explicit baseline buttons when a rewrite exists (F-10)", () => {
      const payload: OutputViewPayload = {
        shape: "determinate",
        prose: { canonical: "Canonical text", rewritten: "Polished text" },
      };
      const { getByTestId, queryByTestId } = render(<ProseTab payload={payload} />);
      expect(getByTestId("prose-refine-rewrite")).toBeTruthy();
      expect(getByTestId("prose-rewrite-from-canonical")).toBeTruthy();
      expect(queryByTestId("prose-suggest-rewrite")).toBeNull();
    });

    it("'Refine rewrite' invokes G6 with the prior rewrite as baseline (F-10)", () => {
      const payload: OutputViewPayload = {
        shape: "determinate",
        prose: { canonical: "Canonical text", rewritten: "Polished text" },
      };
      const { getByTestId } = render(<ProseTab payload={payload} />);
      fireEvent.click(getByTestId("prose-refine-rewrite"));
      expect(session_invokeHook).toHaveBeenCalledWith("G6", {
        baseline: "Polished text",
        baseline_kind: "rewrite",
      });
    });

    it("'Rewrite from canonical' invokes G6 with canonical as baseline (F-10)", () => {
      const payload: OutputViewPayload = {
        shape: "determinate",
        prose: { canonical: "Canonical text", rewritten: "Polished text" },
      };
      const { getByTestId } = render(<ProseTab payload={payload} />);
      fireEvent.click(getByTestId("prose-rewrite-from-canonical"));
      expect(session_invokeHook).toHaveBeenCalledWith("G6", {
        baseline: "Canonical text",
        baseline_kind: "canonical",
      });
    });

    it("single button (no prior rewrite) invokes G6 with canonical baseline (F-10)", () => {
      const payload: OutputViewPayload = {
        shape: "determinate",
        prose: { canonical: "Canonical text" },
      };
      const { getByTestId } = render(<ProseTab payload={payload} />);
      fireEvent.click(getByTestId("prose-suggest-rewrite"));
      expect(session_invokeHook).toHaveBeenCalledWith("G6", {
        baseline: "Canonical text",
        baseline_kind: "canonical",
      });
    });

    it("AiAttributionChip receives the rewrite_invocation record when present (F-09)", () => {
      const record: HookInvocationRecord = {
        id: "inv1",
        hook_id: "G6",
        prompt_name: "prose_rewrite",
        prompt_version: "1.0.0",
        provider_id: "anthropic",
        model_id: "claude-3-7-sonnet-20250219",
        input_hash: "abc",
        decision: "accepted",
        invoked_at: "2026-05-19T10:00:00.000Z",
      };
      const payload: OutputViewPayload = {
        shape: "determinate",
        prose: {
          canonical: "Canonical text",
          rewritten: "Polished text",
          rewrite_invocation: record,
        },
      };
      const { getByTestId } = render(<ProseTab payload={payload} />);
      // The chip is present; its tooltip-bearing form is selected when record
      // is non-null (cursor: help vs default). Visible text uses the short name.
      const chip = getByTestId("ai-attribution-chip");
      expect(chip.textContent?.toLowerCase()).toContain("rewrite");
      // The `cursor: help` style is what AiAttributionChip uses to signal that
      // a tooltip is attached — present only when `record` is non-null.
      expect((chip as HTMLElement).style.cursor).toBe("help");
    });

    it("AiAttributionChip falls back to hook_id-only mode without a record (F-09)", () => {
      const payload: OutputViewPayload = {
        shape: "determinate",
        prose: { canonical: "Canonical text", rewritten: "Polished text" },
      };
      const { getByTestId } = render(<ProseTab payload={payload} />);
      const chip = getByTestId("ai-attribution-chip");
      expect((chip as HTMLElement).style.cursor).toBe("default");
    });
  });
});
