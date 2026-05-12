// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { StatusBadge, failedConditionMessage, FAILED_CONDITION_MESSAGES } from "@/ui/primitives/status-badge";
import type { NodeStatus } from "@/schema";

const EVALUATED_AT = "2026-01-01T00:00:00Z";

const ALL_STATUSES: Array<NodeStatus["status"]> = [
  "open", "satisfied", "contested", "foreclosed", "not_applicable",
];

describe("StatusBadge — all statuses render", () => {
  for (const status of ALL_STATUSES) {
    it(`renders ${status}`, () => {
      const ns: NodeStatus = { status, evaluated_at: EVALUATED_AT };
      const { container } = render(<StatusBadge status={ns} />);
      expect(container.firstChild).toBeTruthy();
    });
  }
});

describe("StatusBadge — legal sub-flag chip", () => {
  it("renders binding chip when legal_mode and via includes binding_authority", () => {
    const ns: NodeStatus = {
      status: "satisfied",
      via: ["binding_authority"],
      evaluated_at: EVALUATED_AT,
    };
    const { queryByTestId } = render(<StatusBadge status={ns} legal_mode />);
    expect(queryByTestId("subflag-binding")).toBeTruthy();
  });

  it("does not render binding chip when legal_mode is false", () => {
    const ns: NodeStatus = {
      status: "satisfied",
      via: ["binding_authority"],
      evaluated_at: EVALUATED_AT,
    };
    const { queryByTestId } = render(<StatusBadge status={ns} legal_mode={false} />);
    expect(queryByTestId("subflag-binding")).toBeNull();
  });

  it("renders persuasive chip when via includes persuasive_authority", () => {
    const ns: NodeStatus = {
      status: "satisfied",
      via: ["persuasive_authority"],
      evaluated_at: EVALUATED_AT,
    };
    const { queryByTestId } = render(<StatusBadge status={ns} legal_mode />);
    expect(queryByTestId("subflag-persuasive")).toBeTruthy();
  });
});

describe("failedConditionMessage", () => {
  it("returns a non-empty string for every condition in FAILED_CONDITION_MESSAGES", () => {
    for (const condition of Object.keys(FAILED_CONDITION_MESSAGES)) {
      const msg = failedConditionMessage(condition);
      expect(msg).toBeTruthy();
      expect(typeof msg).toBe("string");
    }
  });

  it("returns a fallback for unknown condition", () => {
    const msg = failedConditionMessage("unknown_condition_xyz");
    expect(msg).toBeTruthy();
  });
});
