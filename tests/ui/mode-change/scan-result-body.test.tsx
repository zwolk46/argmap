// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ScanResultBody } from "@/ui/mode-change/scan-result-body";

describe("ScanResultBody", () => {
  it("renders empty-state message when no items", () => {
    const { getByTestId } = render(
      <ScanResultBody
        blocking={[]}
        advisory={[]}
        inline_editors={[]}
        direction_resolutions={new Map()}
        onResolutionChanged={() => {}}
        conclusion_title_by_id={new Map()}
      />,
    );
    expect(getByTestId("scan-result-empty").textContent).toContain("ready to commit");
  });

  it("renders blocking section with count and rows", () => {
    const { getByTestId, getAllByTestId } = render(
      <ScanResultBody
        blocking={[
          { rule_id: "R1", severity: "error", node_id: "n1", message: "fix me" },
          { rule_id: "R1", severity: "error", node_id: "n2", message: "fix me too" },
        ]}
        advisory={[]}
        inline_editors={[
          {
            node_id: "n1",
            current_direction_kind: "general",
            required_direction_kind: "legal",
            options: [{ value: "affirm", label: "Affirm" }],
          },
          {
            node_id: "n2",
            current_direction_kind: "general",
            required_direction_kind: "legal",
            options: [{ value: "reverse", label: "Reverse" }],
          },
        ]}
        direction_resolutions={new Map()}
        onResolutionChanged={() => {}}
        conclusion_title_by_id={new Map([["n1", "C1"], ["n2", "C2"]])}
      />,
    );
    expect(getByTestId("scan-result-blocking")).toBeTruthy();
    const rows = getAllByTestId("conclusion-direction-editor-row");
    expect(rows.map((r) => r.getAttribute("data-node-id"))).toEqual(["n1", "n2"]);
  });

  it("renders advisory section when blocking is empty", () => {
    const { getByTestId, queryByTestId } = render(
      <ScanResultBody
        blocking={[]}
        advisory={[
          { rule_id: "ADV-1", severity: "warning", node_id: "n1", message: "heads up" },
        ]}
        inline_editors={[]}
        direction_resolutions={new Map()}
        onResolutionChanged={() => {}}
        conclusion_title_by_id={new Map()}
      />,
    );
    expect(getByTestId("scan-result-advisory")).toBeTruthy();
    expect(queryByTestId("scan-result-blocking")).toBeNull();
  });
});
