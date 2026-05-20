// @vitest-environment happy-dom
/**
 * §13 #4–#6 — canvas keyboard navigation, palette focus, and keyboard
 * edge-creation mode. The existing frame-canvas-interaction.test.tsx
 * mocks ReactFlow to null; this file uses a richer mock that renders a
 * tabIndex=0 div per node so we can simulate focus + keydown events.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import type { FrameVersion, Node } from "@/schema";
import type { ReactElement } from "react";

let lastReactFlowProps: Record<string, unknown> | null = null;

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return {
    ...actual,
    // Render a minimal [data-id] focusable div per node so the capture-phase
    // keydown handler in FrameCanvas (which walks document.activeElement up
    // to the nearest [data-id]) has something to bite on.
    ReactFlow: (props: Record<string, unknown>) => {
      lastReactFlowProps = props;
      const nodes = (props.nodes as Array<{ id: string; ariaLabel?: string }>) ?? [];
      return (
        <div data-testid="rf-mock">
          {nodes.map((n) => (
            <div
              key={n.id}
              data-id={n.id}
              tabIndex={0}
              aria-label={n.ariaLabel}
              data-testid={`rf-node-${n.id}`}
            >
              {n.id}
            </div>
          ))}
        </div>
      );
    },
  };
});

import { FrameCanvas } from "@/ui/canvas";

function makeNode(id: string, x = 0, y = 0, type: Node["type"] = "SubQuestion"): Node {
  const base = {
    id,
    type,
    layer: "frame" as const,
    created_at: "2026-05-20T00:00:00.000Z",
    updated_at: "2026-05-20T00:00:00.000Z",
    presentation: { x, y },
  };
  if (type === "RootQuestion") return { ...base, type: "RootQuestion", statement: id } as Node;
  if (type === "Term")
    return { ...base, type: "Term", name: id, order: 0, dispositive: false } as Node;
  return { ...base, type: "SubQuestion", statement: id, is_jurisdictional: false } as Node;
}

function makeFv(nodes: Node[]): FrameVersion {
  return {
    id: "fv-1",
    frame_id: "fr-1",
    version_number: 1,
    created_at: "2026-05-20T00:00:00.000Z",
    is_milestone: false,
    nodes,
    edges: [],
  };
}

function renderCanvas(
  override: Partial<React.ComponentProps<typeof FrameCanvas>> = {},
): ReactElement {
  const fv = override.frame_version ?? makeFv([makeNode("n1"), makeNode("n2"), makeNode("n3")]);
  return (
    <FrameCanvas
      frame_version={fv}
      layout_result={null}
      operating_mode="frame_building"
      legal_mode={false}
      {...override}
    />
  );
}

describe("§13 #4 — per-node aria-label", () => {
  beforeEach(() => {
    lastReactFlowProps = null;
  });

  it("emits ariaLabel that humanizes the node type and includes the primary text", () => {
    const fv = makeFv([makeNode("n1", 0, 0, "SubQuestion")]);
    render(renderCanvas({ frame_version: fv }));
    const nodes = lastReactFlowProps?.nodes as Array<{ ariaLabel: string }>;
    expect(nodes[0].ariaLabel).toMatch(/sub-question/i);
    expect(nodes[0].ariaLabel).toContain("n1");
  });

  it("falls back to (empty) when primary_text is blank", () => {
    const fv = makeFv([
      {
        id: "n1",
        type: "SubQuestion",
        layer: "frame",
        statement: "",
        is_jurisdictional: false,
        created_at: "2026-05-20T00:00:00.000Z",
        updated_at: "2026-05-20T00:00:00.000Z",
        presentation: { x: 0, y: 0 },
      } as Node,
    ]);
    render(renderCanvas({ frame_version: fv }));
    const nodes = lastReactFlowProps?.nodes as Array<{ ariaLabel: string }>;
    expect(nodes[0].ariaLabel).toContain("(empty)");
  });

  it("truncates a very long primary text to 117 chars + ellipsis", () => {
    const long = "x".repeat(500);
    const fv = makeFv([
      {
        id: "n1",
        type: "SubQuestion",
        layer: "frame",
        statement: long,
        is_jurisdictional: false,
        created_at: "2026-05-20T00:00:00.000Z",
        updated_at: "2026-05-20T00:00:00.000Z",
        presentation: { x: 0, y: 0 },
      } as Node,
    ]);
    render(renderCanvas({ frame_version: fv }));
    const label = (lastReactFlowProps?.nodes as Array<{ ariaLabel: string }>)[0].ariaLabel;
    expect(label.endsWith("…")).toBe(true);
    // "Sub-question: " (14 chars) + 117 + 1 ellipsis = 132
    expect(label.length).toBeLessThanOrEqual(132);
  });
});

describe("§13 #4 — wrapper aria-label", () => {
  beforeEach(() => {
    lastReactFlowProps = null;
  });

  it("aria-labels the canvas wrapper with the keyboard model when not read-only", () => {
    const { getByTestId } = render(renderCanvas({ read_only: false }));
    const wrapper = getByTestId("frame-canvas");
    expect(wrapper.getAttribute("aria-label")).toMatch(/Tab to focus a node/i);
    expect(wrapper.getAttribute("aria-label")).toMatch(/E to start an edge/i);
  });

  it("uses a read-only aria-label when read_only=true", () => {
    const { getByTestId } = render(renderCanvas({ read_only: true }));
    const wrapper = getByTestId("frame-canvas");
    expect(wrapper.getAttribute("aria-label")).toMatch(/read-only/i);
    expect(wrapper.getAttribute("aria-label")).not.toMatch(/E to start an edge/i);
  });
});

describe("§13 #6 — keyboard edge-creation mode", () => {
  beforeEach(() => {
    lastReactFlowProps = null;
  });

  function dispatchOnWrapper(wrapper: HTMLElement, key: string, opts: KeyboardEventInit = {}) {
    const ev = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...opts });
    wrapper.dispatchEvent(ev);
  }

  it("ignores E when no node is focused", () => {
    const on_edge_created = vi.fn();
    const { getByTestId, queryByTestId } = render(renderCanvas({ on_edge_created }));
    const wrapper = getByTestId("frame-canvas");
    dispatchOnWrapper(wrapper, "e");
    expect(queryByTestId("edge-mode-banner")).toBeNull();
  });

  it("enters edge mode when E is pressed with a node focused", () => {
    const { getByTestId, queryByTestId } = render(renderCanvas());
    const wrapper = getByTestId("frame-canvas");
    const n1 = getByTestId("rf-node-n1");
    act(() => {
      n1.focus();
    });
    act(() => {
      dispatchOnWrapper(wrapper, "e");
    });
    expect(queryByTestId("edge-mode-banner")).not.toBeNull();
    expect(queryByTestId("edge-mode-banner")?.textContent).toMatch(/Candidate 1 of 2/);
  });

  it("does not enter edge mode when E is pressed with Cmd/Ctrl/Alt held", () => {
    const { getByTestId, queryByTestId } = render(renderCanvas());
    const wrapper = getByTestId("frame-canvas");
    const n1 = getByTestId("rf-node-n1");
    act(() => {
      n1.focus();
    });
    act(() => {
      dispatchOnWrapper(wrapper, "e", { metaKey: true });
    });
    expect(queryByTestId("edge-mode-banner")).toBeNull();
  });

  it("cycles the candidate forward on ArrowRight and back on ArrowLeft", () => {
    const { getByTestId } = render(renderCanvas());
    const wrapper = getByTestId("frame-canvas");
    const n1 = getByTestId("rf-node-n1");
    act(() => {
      n1.focus();
    });
    act(() => {
      dispatchOnWrapper(wrapper, "e");
    });
    expect(getByTestId("edge-mode-banner").textContent).toMatch(/Candidate 1 of 2/);
    act(() => {
      dispatchOnWrapper(wrapper, "ArrowRight");
    });
    expect(getByTestId("edge-mode-banner").textContent).toMatch(/Candidate 2 of 2/);
    act(() => {
      dispatchOnWrapper(wrapper, "ArrowLeft");
    });
    expect(getByTestId("edge-mode-banner").textContent).toMatch(/Candidate 1 of 2/);
  });

  it("Escape cancels edge mode", () => {
    const on_edge_created = vi.fn();
    const { getByTestId, queryByTestId } = render(renderCanvas({ on_edge_created }));
    const wrapper = getByTestId("frame-canvas");
    const n1 = getByTestId("rf-node-n1");
    act(() => {
      n1.focus();
    });
    act(() => {
      dispatchOnWrapper(wrapper, "e");
    });
    expect(queryByTestId("edge-mode-banner")).not.toBeNull();
    act(() => {
      dispatchOnWrapper(wrapper, "Escape");
    });
    expect(queryByTestId("edge-mode-banner")).toBeNull();
    expect(on_edge_created).not.toHaveBeenCalled();
  });

  it("Enter commits the edge from source to the current candidate", () => {
    const on_edge_created = vi.fn();
    const { getByTestId, queryByTestId } = render(renderCanvas({ on_edge_created }));
    const wrapper = getByTestId("frame-canvas");
    const n1 = getByTestId("rf-node-n1");
    act(() => {
      n1.focus();
    });
    act(() => {
      dispatchOnWrapper(wrapper, "e");
    });
    // First candidate (n2) is the initial selection.
    act(() => {
      dispatchOnWrapper(wrapper, "Enter");
    });
    expect(on_edge_created).toHaveBeenCalledOnce();
    expect(on_edge_created).toHaveBeenCalledWith("n1", "n2");
    // Banner should be gone after commit.
    expect(queryByTestId("edge-mode-banner")).toBeNull();
  });

  it("Enter on second candidate commits to that node", () => {
    const on_edge_created = vi.fn();
    const { getByTestId } = render(renderCanvas({ on_edge_created }));
    const wrapper = getByTestId("frame-canvas");
    const n1 = getByTestId("rf-node-n1");
    act(() => {
      n1.focus();
    });
    act(() => {
      dispatchOnWrapper(wrapper, "e");
    });
    act(() => {
      dispatchOnWrapper(wrapper, "ArrowRight");
    });
    act(() => {
      dispatchOnWrapper(wrapper, "Enter");
    });
    expect(on_edge_created).toHaveBeenCalledWith("n1", "n3");
  });

  it("Tab cycles candidates the same as ArrowRight", () => {
    const { getByTestId } = render(renderCanvas());
    const wrapper = getByTestId("frame-canvas");
    const n1 = getByTestId("rf-node-n1");
    act(() => {
      n1.focus();
    });
    act(() => {
      dispatchOnWrapper(wrapper, "e");
    });
    act(() => {
      dispatchOnWrapper(wrapper, "Tab");
    });
    expect(getByTestId("edge-mode-banner").textContent).toMatch(/Candidate 2 of 2/);
  });

  it("read_only=true disables E entry", () => {
    const { getByTestId, queryByTestId } = render(renderCanvas({ read_only: true }));
    const wrapper = getByTestId("frame-canvas");
    const n1 = getByTestId("rf-node-n1");
    act(() => {
      n1.focus();
    });
    act(() => {
      dispatchOnWrapper(wrapper, "e");
    });
    expect(queryByTestId("edge-mode-banner")).toBeNull();
  });

  it("paints data-edge-source on source node and data-edge-candidate on the active candidate", () => {
    const { getByTestId } = render(renderCanvas());
    const wrapper = getByTestId("frame-canvas");
    const n1 = getByTestId("rf-node-n1");
    act(() => {
      n1.focus();
    });
    act(() => {
      dispatchOnWrapper(wrapper, "e");
    });
    expect(getByTestId("rf-node-n1").getAttribute("data-edge-source")).toBe("true");
    expect(getByTestId("rf-node-n2").getAttribute("data-edge-candidate")).toBe("true");
    expect(getByTestId("rf-node-n3").getAttribute("data-edge-candidate")).toBeNull();
    act(() => {
      dispatchOnWrapper(wrapper, "ArrowRight");
    });
    expect(getByTestId("rf-node-n2").getAttribute("data-edge-candidate")).toBeNull();
    expect(getByTestId("rf-node-n3").getAttribute("data-edge-candidate")).toBe("true");
  });

  it("clears data-edge-* attributes after commit", () => {
    const on_edge_created = vi.fn();
    const { getByTestId } = render(renderCanvas({ on_edge_created }));
    const wrapper = getByTestId("frame-canvas");
    const n1 = getByTestId("rf-node-n1");
    act(() => {
      n1.focus();
    });
    act(() => {
      dispatchOnWrapper(wrapper, "e");
    });
    act(() => {
      dispatchOnWrapper(wrapper, "Enter");
    });
    expect(getByTestId("rf-node-n1").getAttribute("data-edge-source")).toBeNull();
    expect(getByTestId("rf-node-n2").getAttribute("data-edge-candidate")).toBeNull();
  });

  it("does not enter edge mode when keydown originates from an INPUT", () => {
    const { getByTestId, queryByTestId } = render(renderCanvas());
    const wrapper = getByTestId("frame-canvas");
    // Inject an input into the wrapper, focus it, dispatch keydown FROM it.
    const input = document.createElement("input");
    wrapper.appendChild(input);
    input.focus();
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "e", bubbles: true, cancelable: true }),
      );
    });
    expect(queryByTestId("edge-mode-banner")).toBeNull();
    input.remove();
  });
});
