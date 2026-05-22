// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Node } from "@/schema";
import { NodeChip, nodeLabel } from "@/ui/primitives";

const T0 = "2026-05-21T00:00:00.000Z";

const Q: Node = {
  id: "cp-1",
  type: "Checkpoint",
  layer: "frame",
  question: "Did Zach act with intent to deprive an owner of the property?",
  answer_type: "boolean",
  options: [
    { id: "cp-1-yes", label: "Yes", satisfies: true, target_node_id: "c-1" },
    { id: "cp-1-no", label: "No", satisfies: false },
  ],
  requires_premise: false,
  requires_authority: false,
  created_at: T0,
  updated_at: T0,
};

const SQ: Node = {
  id: "sq-1",
  type: "SubQuestion",
  layer: "frame",
  statement: "Are all elements established?",
  is_jurisdictional: false,
  created_at: T0,
  updated_at: T0,
};

describe("nodeLabel", () => {
  it("prefers question for Checkpoint", () => {
    expect(nodeLabel(Q)).toContain("Did Zach act with intent");
  });

  it("prefers statement for SubQuestion", () => {
    expect(nodeLabel(SQ)).toBe("Are all elements established?");
  });

  it("truncates with ellipsis past max_chars", () => {
    const long = nodeLabel(Q, 20);
    expect(long.length).toBeLessThanOrEqual(20);
    expect(long.endsWith("…")).toBe(true);
  });

  it("returns Missing node when the resolver yields undefined", () => {
    expect(nodeLabel(undefined)).toBe("Missing node");
  });
});

describe("NodeChip", () => {
  it("renders the resolved node's label, never the raw uuid", () => {
    render(
      <NodeChip node_id={Q.id} nodes={[Q, SQ]} on_navigate={() => undefined} max_chars={64} />,
    );
    const chip = screen.getByTestId("node-chip");
    expect(chip.textContent).toContain("Did Zach act with intent");
    expect(chip.textContent).not.toContain(Q.id);
  });

  it("renders as a button with the click-to-focus affordance when navigable", () => {
    const handler = vi.fn();
    render(<NodeChip node_id={Q.id} nodes={[Q]} on_navigate={handler} />);
    const chip = screen.getByTestId("node-chip");
    expect(chip.tagName).toBe("BUTTON");
    fireEvent.click(chip);
    expect(handler).toHaveBeenCalledWith(Q.id);
  });

  it("falls back to a static badge when on_navigate is omitted", () => {
    render(<NodeChip node_id={Q.id} nodes={[Q]} />);
    const chip = screen.getByTestId("node-chip");
    expect(chip.tagName).toBe("SPAN");
  });

  it("surfaces a Missing-node state when the id can't be resolved", () => {
    render(<NodeChip node_id="ghost-id" nodes={[Q]} />);
    const chip = screen.getByTestId("node-chip");
    expect(chip.textContent).toContain("Missing node");
  });

  it("activates on Enter and Space (keyboard accessibility)", () => {
    const handler = vi.fn();
    render(<NodeChip node_id={Q.id} nodes={[Q]} on_navigate={handler} />);
    const chip = screen.getByTestId("node-chip");
    fireEvent.keyDown(chip, { key: "Enter" });
    fireEvent.keyDown(chip, { key: " " });
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
