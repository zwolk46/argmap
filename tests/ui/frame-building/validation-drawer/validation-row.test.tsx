// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ValidationRow } from "@/ui/frame-building/validation-drawer/validation-row";
import type { ValidationResult } from "@/schema";

function makeWarning(node_id?: string): ValidationResult {
  return {
    rule_id: "V-FR-1",
    severity: "warning",
    message: "Frame is missing a conclusion",
    node_id,
  };
}

function makeError(node_id?: string): ValidationResult {
  return {
    rule_id: "V-FR-E",
    severity: "error",
    message: "Root question is missing",
    node_id,
  };
}

describe("ValidationRow", () => {
  const noop = () => {};

  it("renders the rule_id", () => {
    const { getByText } = render(
      <ValidationRow
        result={makeWarning("n1")}
        is_dismissed={false}
        on_jump_to_node={noop}
        on_dismiss={noop}
        on_restore={noop}
      />,
    );
    expect(getByText("V-FR-1")).toBeTruthy();
  });

  it("renders the message", () => {
    const { getByText } = render(
      <ValidationRow
        result={makeWarning("n1")}
        is_dismissed={false}
        on_jump_to_node={noop}
        on_dismiss={noop}
        on_restore={noop}
      />,
    );
    expect(getByText("Frame is missing a conclusion")).toBeTruthy();
  });

  it("'Jump to node' button calls on_jump_to_node with the correct node_id", () => {
    const on_jump_to_node = vi.fn();
    const { getByLabelText } = render(
      <ValidationRow
        result={makeWarning("n1")}
        is_dismissed={false}
        on_jump_to_node={on_jump_to_node}
        on_dismiss={noop}
        on_restore={noop}
      />,
    );
    fireEvent.click(getByLabelText("Jump to node"));
    expect(on_jump_to_node).toHaveBeenCalledWith("n1");
  });

  it("errors do NOT render a dismiss button", () => {
    const { queryByLabelText } = render(
      <ValidationRow
        result={makeError("n1")}
        is_dismissed={false}
        on_jump_to_node={noop}
        on_dismiss={noop}
        on_restore={noop}
      />,
    );
    expect(queryByLabelText("Dismiss warning")).toBeNull();
    expect(queryByLabelText("Restore warning")).toBeNull();
  });

  it("warnings that are not dismissed render a dismiss button", () => {
    const on_dismiss = vi.fn();
    const { getByLabelText } = render(
      <ValidationRow
        result={makeWarning("n1")}
        is_dismissed={false}
        on_jump_to_node={noop}
        on_dismiss={on_dismiss}
        on_restore={noop}
      />,
    );
    const btn = getByLabelText("Dismiss warning");
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(on_dismiss).toHaveBeenCalled();
  });

  it("dismissed warnings render a restore button instead of dismiss", () => {
    const on_restore = vi.fn();
    const { getByLabelText, queryByLabelText } = render(
      <ValidationRow
        result={makeWarning("n1")}
        is_dismissed={true}
        on_jump_to_node={noop}
        on_dismiss={noop}
        on_restore={on_restore}
      />,
    );
    expect(queryByLabelText("Dismiss warning")).toBeNull();
    const btn = getByLabelText("Restore warning");
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(on_restore).toHaveBeenCalled();
  });

  it("does not render jump-to-node button when node_id is absent", () => {
    const { queryByLabelText } = render(
      <ValidationRow
        result={makeWarning()} // no node_id
        is_dismissed={false}
        on_jump_to_node={noop}
        on_dismiss={noop}
        on_restore={noop}
      />,
    );
    expect(queryByLabelText("Jump to node")).toBeNull();
  });
});
