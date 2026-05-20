// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import {
  NodePalette,
  visibleNodeTypesForPalette,
  buildNodeDefaults,
} from "@/ui/frame-building/left-pane/node-palette";
import type { Node, NodeType } from "@/schema";

const mockApplyPatch = vi.fn();
let id_counter = 0;
const generateId = vi.fn(() => `node-${++id_counter}`);
const FIXED_NOW = "2026-05-13T00:00:00.000Z";

vi.mock("@/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state")>();
  return {
    ...actual,
    useFrameStore: vi.fn((selector: (s: object) => unknown) =>
      selector({
        frame: { mode: "legal", flavor: undefined, id: "f1" },
        frame_version: { nodes: [], edges: [] },
      }),
    ),
    useRepository: vi.fn(() => ({
      frame_store: { getState: () => ({ applyPatch: mockApplyPatch }) },
      generateId,
      now: () => FIXED_NOW,
    })),
  };
});

describe("visibleNodeTypesForPalette (pure function)", () => {
  it("legal mode includes Authority", () => {
    const types = visibleNodeTypesForPalette("legal", undefined, false, false);
    expect(types).toContain("Authority");
  });

  it("legal mode includes all standard node types", () => {
    const types = visibleNodeTypesForPalette("legal", undefined, false, false);
    expect(types).toContain("RootQuestion");
    expect(types).toContain("SubQuestion");
    expect(types).toContain("Conclusion");
    expect(types).toContain("LogicalGate");
    expect(types).toContain("Checkpoint");
  });

  it("general personal mode excludes Authority when authority_enabled_in_personal is false", () => {
    const types = visibleNodeTypesForPalette("general", "personal", false, false);
    expect(types).not.toContain("Authority");
  });

  it("general personal mode includes Authority when authority_enabled_in_personal is true", () => {
    const types = visibleNodeTypesForPalette("general", "personal", true, false);
    expect(types).toContain("Authority");
  });

  it("general academic mode includes Authority", () => {
    const types = visibleNodeTypesForPalette("general", "academic", false, false);
    expect(types).toContain("Authority");
  });

  it("returns at least 7 types for legal mode", () => {
    const types = visibleNodeTypesForPalette("legal", undefined, false, false);
    expect(types.length).toBeGreaterThanOrEqual(7);
  });
});

describe("buildNodeDefaults — every node type carries layer + created_at + updated_at + type-specific required fields", () => {
  const gid = () => "test-id";
  const now = "2026-05-13T00:00:00.000Z";

  it.each<[NodeType, Partial<Node>]>([
    ["RootQuestion", { layer: "frame", statement: "" }],
    ["SubQuestion", { layer: "frame", statement: "", is_jurisdictional: false }],
    ["Term", { layer: "frame", name: "", order: 0, dispositive: false }],
    ["Interpretation", { layer: "frame", statement: "" }],
    [
      "Checkpoint",
      {
        layer: "frame",
        question: "",
        answer_type: "boolean",
        requires_premise: false,
        requires_authority: false,
      },
    ],
    ["LogicalGate", { layer: "frame", gate_type: "AND", inputs: [] }],
    [
      "Conclusion",
      { layer: "frame", statement: "", direction: { kind: "legal", value: "affirm" }, tags: [] },
    ],
    ["Authority", { layer: "frame", citation: "" }],
  ])("%s gets a fully-stamped Node", (node_type, expected_shape) => {
    const node = buildNodeDefaults(node_type, gid, now) as unknown as Record<string, unknown>;
    expect(node.id).toBe("test-id");
    expect(node.type).toBe(node_type);
    expect(node.created_at).toBe(now);
    expect(node.updated_at).toBe(now);
    for (const [key, value] of Object.entries(expected_shape)) {
      expect(node[key]).toEqual(value);
    }
  });

  it("Checkpoint generates two stable option ids derived from the node id", () => {
    const node = buildNodeDefaults("Checkpoint", () => "cp-1", now) as unknown as {
      options: ReadonlyArray<{ id: string }>;
    };
    expect(node.options.map((o) => o.id)).toEqual(["cp-1-yes", "cp-1-no"]);
  });

  it("does not produce a stray `name` field on Authority (regression: Authority has no `name` field in the schema)", () => {
    const node = buildNodeDefaults("Authority", () => "a-1", now) as unknown as Record<
      string,
      unknown
    >;
    expect("name" in node).toBe(false);
  });
});

describe("NodePalette component", () => {
  beforeEach(() => {
    mockApplyPatch.mockClear();
    id_counter = 0;
    generateId.mockClear();
  });

  it("renders without crashing", () => {
    const { container } = render(<NodePalette />);
    expect(container).toBeTruthy();
  });

  it("renders the node palette container", () => {
    const { container } = render(<NodePalette />);
    const palette = container.querySelector('[aria-label="Node palette"]');
    expect(palette).toBeTruthy();
  });

  it("uses visible_types_override when provided", () => {
    const { container } = render(
      <NodePalette visible_types_override={["RootQuestion", "Conclusion"]} />,
    );
    const palette = container.querySelector('[aria-label="Node palette"]');
    const buttons = palette?.querySelectorAll("button");
    expect(buttons?.length).toBe(2);
  });

  it("clicking a palette item dispatches a `node_added` patch with the deterministic id from useRepository().generateId()", () => {
    const { container } = render(<NodePalette visible_types_override={["RootQuestion"]} />);
    const button = container.querySelector(
      '[aria-label="Node palette"] button',
    ) as HTMLButtonElement;
    fireEvent.click(button);

    expect(generateId).toHaveBeenCalledTimes(1);
    expect(mockApplyPatch).toHaveBeenCalledTimes(1);
    const call = mockApplyPatch.mock.calls[0]![0] as {
      kind: string;
      node: Record<string, unknown>;
    };
    expect(call.kind).toBe("node_added");
    expect(call.node.id).toBe("node-1");
    expect(call.node.type).toBe("RootQuestion");
    expect(call.node.layer).toBe("frame");
    expect(call.node.created_at).toBe(FIXED_NOW);
    expect(call.node.updated_at).toBe(FIXED_NOW);
    expect(call.node.statement).toBe("");
  });

  it("clicking a Checkpoint palette item dispatches with both requires_premise and requires_authority defaulted to false", () => {
    const { container } = render(<NodePalette visible_types_override={["Checkpoint"]} />);
    const button = container.querySelector(
      '[aria-label="Node palette"] button',
    ) as HTMLButtonElement;
    fireEvent.click(button);

    const call = mockApplyPatch.mock.calls[0]![0] as { node: Record<string, unknown> };
    expect(call.node.requires_premise).toBe(false);
    expect(call.node.requires_authority).toBe(false);
    expect(call.node.answer_type).toBe("boolean");
  });

  it("P0-12: clicking a palette item stamps a presentation.x/y so the node doesn't render at (0,0)", () => {
    const { container } = render(<NodePalette visible_types_override={["RootQuestion"]} />);
    const button = container.querySelector(
      '[aria-label="Node palette"] button',
    ) as HTMLButtonElement;
    fireEvent.click(button);
    const call = mockApplyPatch.mock.calls[0]![0] as {
      node: Record<string, unknown> & { presentation?: { x?: number; y?: number } };
    };
    expect(call.node.presentation).toBeDefined();
    expect(typeof call.node.presentation?.x).toBe("number");
    expect(typeof call.node.presentation?.y).toBe("number");
  });

  it("§13 #5: clicking a palette item fires on_node_created with the new node id after applyPatch", () => {
    const on_node_created = vi.fn();
    const { container } = render(
      <NodePalette visible_types_override={["RootQuestion"]} on_node_created={on_node_created} />,
    );
    const button = container.querySelector(
      '[aria-label="Node palette"] button',
    ) as HTMLButtonElement;
    fireEvent.click(button);
    expect(on_node_created).toHaveBeenCalledOnce();
    expect(on_node_created).toHaveBeenCalledWith("node-1");
    // Order matters: applyPatch must fire before on_node_created so the
    // parent can focus the node knowing it's already in frame_version.
    const apply_order = mockApplyPatch.mock.invocationCallOrder[0]!;
    const created_order = on_node_created.mock.invocationCallOrder[0]!;
    expect(apply_order).toBeLessThan(created_order);
  });

  it("§13 #5: not providing on_node_created leaves applyPatch behavior unchanged", () => {
    const { container } = render(<NodePalette visible_types_override={["RootQuestion"]} />);
    const button = container.querySelector(
      '[aria-label="Node palette"] button',
    ) as HTMLButtonElement;
    fireEvent.click(button);
    expect(mockApplyPatch).toHaveBeenCalledOnce();
  });
});
