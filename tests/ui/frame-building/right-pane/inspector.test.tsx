// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type { FrameStoreSnapshot } from "@/state";

// Mock sub-components before importing Inspector
vi.mock("@/ui/frame-building/right-pane/inspector-empty", () => ({
  InspectorEmpty: () => <div data-testid="inspector-empty" />,
}));
vi.mock("@/ui/frame-building/right-pane/inspector-node", () => ({
  InspectorNode: (props: { node_id: string }) => (
    <div data-testid="inspector-node" data-node-id={props.node_id} />
  ),
}));
vi.mock("@/ui/frame-building/right-pane/inspector-edge", () => ({
  InspectorEdge: (props: { edge_id: string }) => (
    <div data-testid="inspector-edge" data-edge-id={props.edge_id} />
  ),
}));
vi.mock("@/ui/frame-building/right-pane/inspector-multi", () => ({
  InspectorMulti: (props: { node_ids: string[] }) => (
    <div data-testid="inspector-multi" data-count={props.node_ids.length} />
  ),
}));

const MOCK_FRAME_VERSION = {
  id: "fv1",
  frame_id: "f1",
  version_number: 1,
  created_at: "2026-01-01",
  nodes: [],
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
        frame_version: MOCK_FRAME_VERSION as FrameStoreSnapshot["frame_version"],
        validation: [],
        is_loading: false,
        error: null,
        pending_suggestion: null,
        suggestion_status: "idle",
      }),
    ),
  };
});

import { Inspector } from "@/ui/frame-building/right-pane/inspector";
import type { InspectorSelection } from "@/ui/frame-building/right-pane/inspector";

const noop = () => {};

describe("Inspector", () => {
  it("renders InspectorEmpty for { kind: 'empty' }", () => {
    const selection: InspectorSelection = { kind: "empty" };
    const { getByTestId } = render(
      <Inspector
        selection={selection}
        on_select={noop}
        on_request_delete={noop}
        on_open_settings={noop}
      />,
    );
    expect(getByTestId("inspector-empty")).toBeTruthy();
  });

  it("renders InspectorNode for { kind: 'node', node_id: 'n1' }", () => {
    const selection: InspectorSelection = { kind: "node", node_id: "n1" };
    const { getByTestId } = render(
      <Inspector
        selection={selection}
        on_select={noop}
        on_request_delete={noop}
        on_open_settings={noop}
      />,
    );
    const el = getByTestId("inspector-node");
    expect(el).toBeTruthy();
    expect(el.getAttribute("data-node-id")).toBe("n1");
  });

  it("renders InspectorEdge for { kind: 'edge', edge_id: 'e1' }", () => {
    const selection: InspectorSelection = { kind: "edge", edge_id: "e1" };
    const { getByTestId } = render(
      <Inspector
        selection={selection}
        on_select={noop}
        on_request_delete={noop}
        on_open_settings={noop}
      />,
    );
    const el = getByTestId("inspector-edge");
    expect(el).toBeTruthy();
    expect(el.getAttribute("data-edge-id")).toBe("e1");
  });

  it("renders InspectorMulti for { kind: 'multi', node_ids: ['n1','n2'], edge_ids: [] }", () => {
    const selection: InspectorSelection = {
      kind: "multi",
      node_ids: ["n1", "n2"],
      edge_ids: [],
    };
    const { getByTestId } = render(
      <Inspector
        selection={selection}
        on_select={noop}
        on_request_delete={noop}
        on_open_settings={noop}
      />,
    );
    const el = getByTestId("inspector-multi");
    expect(el).toBeTruthy();
    expect(el.getAttribute("data-count")).toBe("2");
  });
});
