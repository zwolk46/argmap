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

  it("wires the record fields into the tooltip content (hook id, model, prompt, timestamp)", () => {
    // shadcn/Radix tooltip doesn't synthesize a hover-open from
    // fireEvent.mouseEnter under happy-dom (Radix uses pointer events with
    // hoverable-area detection that the synthetic DOM doesn't reproduce).
    // The chip's contract is "if a record is provided, the tooltip wraps
    // the chip with the formatted fields" — assert that contract via the
    // visible DOM after we force-render the wrapper instead of via hover.
    const { container } = renderChip(FIXTURE);
    // Radix mounts the tooltip lazily; force a focus to open it.
    const trigger = container.querySelector(
      "[data-testid='ai-attribution-chip']",
    ) as HTMLElement | null;
    if (trigger) fireEvent.focus(trigger);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    // Look for the model + hook id in the rendered DOM. Radix may render
    // the tooltip content in multiple slots (visible + sr-only describedby);
    // any occurrence proves the wiring.
    expect(container.ownerDocument.body.textContent).toContain(FIXTURE.hook_id);
    expect(container.ownerDocument.body.textContent).toContain(FIXTURE.model_id);
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
