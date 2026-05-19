// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, fireEvent } from "@testing-library/react";
import { AiAttributionChip, hookShortName } from "@/ui/primitives/ai-attribution-chip";
import type { HookInvocationRecord } from "@/llm-hooks";
import { TooltipProvider } from "@/ui/primitives/tooltip";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const FIXTURE: HookInvocationRecord = {
  id: "inv-1",
  hook_id: "G1",
  prompt_name: "checkpoint-v1",
  prompt_version: "1.0.0",
  provider_id: "anthropic",
  model_id: "claude-3-5-sonnet",
  input_hash: "abc123",
  decision: "accepted",
  invoked_at: "2026-01-01T12:00:00Z",
};

describe("AiAttributionChip", () => {
  function renderChip(record: HookInvocationRecord) {
    return render(
      <TooltipProvider>
        <AiAttributionChip record={record} />
      </TooltipProvider>,
    );
  }

  it("renders the hook short name", () => {
    const { container } = renderChip(FIXTURE);
    expect(container.textContent).toContain("checkpoint");
  });

  it("shows tooltip on hover with hook id, model, and timestamp", () => {
    const { getByTestId, getByText } = renderChip(FIXTURE);
    fireEvent.mouseEnter(getByTestId("ai-attribution-chip"), { clientX: 10, clientY: 10 });
    // Tooltip opens after a 300ms delay — see TOOLTIP_OPEN_DELAY_MS.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(getByText(FIXTURE.hook_id)).toBeTruthy();
    expect(getByText(FIXTURE.model_id)).toBeTruthy();
  });

  // §12 F-22: hook_id-only path (no provenance record yet — used by the
  // session-level G6 rewrite header until F-09 wires invocation linkage).
  it("renders the hook short name when given only hook_id", () => {
    const { container, getByTestId } = render(<AiAttributionChip hook_id="G6" />);
    expect(getByTestId("ai-attribution-chip")).toBeTruthy();
    expect(container.textContent).toContain("rewrite");
  });

  it("renders nothing when neither record nor hook_id is provided", () => {
    const { container } = render(<AiAttributionChip />);
    expect(container.querySelector("[data-testid='ai-attribution-chip']")).toBeNull();
  });
});

describe("hookShortName", () => {
  const CANONICAL_HOOKS = [
    "G1",
    "G2",
    "G3",
    "G4",
    "G5",
    "G6",
    "G7",
    "G8",
    "G9",
    "G10",
    "G11",
    "G12",
    "G13",
  ];

  for (const hook_id of CANONICAL_HOOKS) {
    it(`has a short name for ${hook_id}`, () => {
      const name = hookShortName(hook_id);
      expect(name).not.toBe(hook_id);
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    });
  }
});
