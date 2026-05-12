// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TypeIcon, typeIconFor } from "@/ui/primitives/type-icon";
import type { NodeType } from "@/schema";

const ALL_NODE_TYPES: Array<NodeType> = [
  "RootQuestion", "SubQuestion", "Term", "Interpretation",
  "Checkpoint", "LogicalGate", "Conclusion", "Authority", "Premise",
];

describe("TypeIcon", () => {
  for (const node_type of ALL_NODE_TYPES) {
    it(`renders a non-empty glyph for ${node_type}`, () => {
      const { container } = render(<TypeIcon node_type={node_type} size={14} />);
      expect(container.textContent?.trim()).toBeTruthy();
    });
  }

  it("renders a glyph for premise_pill variant", () => {
    const { container } = render(<TypeIcon node_type="premise_pill" size={14} />);
    expect(container.textContent?.trim()).toBeTruthy();
  });

  it("renders a glyph for edge variant", () => {
    const { container } = render(<TypeIcon node_type="edge" size={14} />);
    expect(container.textContent?.trim()).toBeTruthy();
  });
});

describe("typeIconFor", () => {
  it("returns TypeIcon component", () => {
    const Comp = typeIconFor("RootQuestion");
    expect(Comp).toBe(TypeIcon);
  });
});
