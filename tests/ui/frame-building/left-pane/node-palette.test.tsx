// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import {
  NodePalette,
  visibleNodeTypesForPalette,
} from "@/ui/frame-building/left-pane/node-palette";

const mockApplyPatch = vi.fn();

vi.mock("@/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state")>();
  return {
    ...actual,
    useFrameStore: vi.fn((selector: (s: object) => unknown) =>
      selector({
        frame: { mode: "general", flavor: "personal", id: "f1" },
        frame_version: { nodes: [], edges: [] },
      }),
    ),
    useRepository: vi.fn(() => ({
      frame_store: { getState: () => ({ applyPatch: mockApplyPatch }) },
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

describe("NodePalette component", () => {
  beforeEach(() => {
    mockApplyPatch.mockClear();
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
    // 2 palette items expected
    const buttons = palette?.querySelectorAll("button");
    expect(buttons?.length).toBe(2);
  });
});
