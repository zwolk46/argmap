// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import type { FrameStoreSnapshot } from "@/state";

const MOCK_FRAME_VERSION = {
  id: "fv1",
  frame_id: "f1",
  version_number: 1,
  created_at: "2026-01-01",
  nodes: [
    { id: "n1", type: "RootQuestion", statement: "Q1", x: 0, y: 0 },
    { id: "n2", type: "SubQuestion", statement: "Q2", x: 0, y: 0 },
  ],
  edges: [],
  is_milestone: false,
};

vi.mock("@/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state")>();
  return {
    ...actual,
    useFrameStore: vi.fn((selector: (s: Partial<FrameStoreSnapshot>) => unknown) =>
      selector({
        frame: { id: "f1" } as FrameStoreSnapshot["frame"],
        frame_version: MOCK_FRAME_VERSION as unknown as FrameStoreSnapshot["frame_version"],
        validation: [],
        is_loading: false,
        error: null,
        pending_suggestion: null,
        suggestion_status: "idle",
      }),
    ),
  };
});

import { InspectorMulti } from "@/ui/frame-building/right-pane/inspector-multi";

describe("InspectorMulti", () => {
  it("renders count summary with node and edge counts", () => {
    const { container } = render(
      <InspectorMulti node_ids={["n1", "n2"]} edge_ids={[]} on_request_delete_multi={() => {}} />,
    );
    // The summary text "2 nodes selected" appears in the container
    const body = container.textContent ?? "";
    expect(body).toMatch(/2 nodes/);
    // edge count 0 doesn't render edge text per the component impl
  });

  it("renders count summary with edges when present", () => {
    const { container } = render(
      <InspectorMulti
        node_ids={["n1"]}
        edge_ids={["e1", "e2"]}
        on_request_delete_multi={() => {}}
      />,
    );
    // The summary div contains "1 node, 2 edges selected"
    const body = container.textContent ?? "";
    expect(body).toMatch(/1 node/);
    expect(body).toMatch(/2 edges/);
  });

  it("bulk delete button calls on_request_delete_multi with the node_ids", () => {
    const on_request_delete_multi = vi.fn();
    const { getByRole } = render(
      <InspectorMulti
        node_ids={["n1", "n2"]}
        edge_ids={[]}
        on_request_delete_multi={on_request_delete_multi}
      />,
    );
    const deleteBtn = getByRole("button", { name: /Delete 2 nodes/ });
    fireEvent.click(deleteBtn);
    expect(on_request_delete_multi).toHaveBeenCalledWith(["n1", "n2"]);
  });

  it("does not render bulk delete button when no nodes are selected", () => {
    const { queryByRole } = render(
      <InspectorMulti node_ids={[]} edge_ids={["e1"]} on_request_delete_multi={() => {}} />,
    );
    expect(queryByRole("button", { name: /Delete/ })).toBeNull();
  });
});
