// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { AiAttributionChip, hookShortName } from "@/ui/primitives/ai-attribution-chip";
import type { HookInvocationRecord } from "@/llm-hooks";
import { TooltipProvider } from "@/ui/primitives/tooltip";

const FIXTURE: HookInvocationRecord = {
  id: "inv-1",
  hook_id: "g1-checkpoint-suggestion",
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
    expect(getByText(FIXTURE.hook_id)).toBeTruthy();
    expect(getByText(FIXTURE.model_id)).toBeTruthy();
  });
});

describe("hookShortName", () => {
  const V1_HOOKS = [
    "g1-checkpoint-suggestion",
    "g2-interpretation-suggestion",
    "g3-reasoning-summary",
    "g4-cross-implications",
    "g5-burden-thresholds",
    "g6-prose-rewrite",
    "g8-conclusion-direction",
    "g9-authority-binding",
    "g11-gate-suggestion",
    "g13-session-advisor",
  ];

  for (const hook_id of V1_HOOKS) {
    it(`has a short name for ${hook_id}`, () => {
      const name = hookShortName(hook_id);
      expect(name).not.toBe(hook_id); // must be abbreviated
      expect(name.length).toBeLessThan(hook_id.length);
    });
  }
});
