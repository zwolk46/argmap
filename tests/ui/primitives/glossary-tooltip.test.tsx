// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { GLOSSARY_DICTIONARY, GlossaryTooltip } from "@/ui/primitives/glossary-tooltip";
import { TooltipProvider } from "@/ui/primitives/tooltip";

// Mock useFrameStore to control legal mode
vi.mock("@/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state")>();
  return {
    ...actual,
    useFrameStore: vi.fn((selector: (s: { frame: { mode: string } | null }) => unknown) =>
      selector({ frame: { mode: "legal" } }),
    ),
  };
});

describe("GLOSSARY_DICTIONARY", () => {
  const NODE_TYPES = [
    "RootQuestion",
    "SubQuestion",
    "Term",
    "Interpretation",
    "Checkpoint",
    "LogicalGate",
    "Conclusion",
    "Authority",
    "Premise",
  ];

  for (const node_type of NODE_TYPES) {
    it(`has an entry for ${node_type}`, () => {
      expect(GLOSSARY_DICTIONARY[node_type]).toBeDefined();
      expect(GLOSSARY_DICTIONARY[node_type].term).toBeTruthy();
      expect(GLOSSARY_DICTIONARY[node_type].definition).toBeTruthy();
    });
  }

  const LEGAL_CONCEPTS = [
    "jurisdiction",
    "binding_authority",
    "persuasive_authority",
    "burden_of_proof",
  ];
  for (const concept of LEGAL_CONCEPTS) {
    it(`has a legal-only entry for ${concept}`, () => {
      expect(GLOSSARY_DICTIONARY[concept]).toBeDefined();
      expect(GLOSSARY_DICTIONARY[concept].legal_only).toBe(true);
    });
  }
});

describe("GlossaryTooltip", () => {
  it("renders children for unknown entry key", () => {
    const { getByTestId } = render(
      <TooltipProvider>
        <GlossaryTooltip entry_key="nonexistent">
          <span data-testid="child">text</span>
        </GlossaryTooltip>
      </TooltipProvider>,
    );
    expect(getByTestId("child")).toBeTruthy();
  });

  it("wraps children in a Tooltip for known entry", () => {
    const { getByTestId } = render(
      <TooltipProvider>
        <GlossaryTooltip entry_key="RootQuestion">
          <span data-testid="child">text</span>
        </GlossaryTooltip>
      </TooltipProvider>,
    );
    expect(getByTestId("child")).toBeTruthy();
  });
});
