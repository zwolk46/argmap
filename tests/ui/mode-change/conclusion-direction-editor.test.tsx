// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ConclusionDirectionEditorRow } from "@/ui/mode-change/conclusion-direction-editor";

describe("ConclusionDirectionEditorRow", () => {
  it("constructs a legal direction when required_direction_kind = 'legal'", () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <ConclusionDirectionEditorRow
        editor={{
          node_id: "n1",
          current_direction_kind: "general",
          required_direction_kind: "legal",
          options: [
            { value: "affirm", label: "Affirm" },
            { value: "reverse", label: "Reverse" },
          ],
        }}
        conclusion_title="Decision"
        current_value={undefined}
        onValueChanged={onChange}
      />,
    );
    fireEvent.change(getByTestId("direction-select"), { target: { value: "affirm" } });
    expect(onChange).toHaveBeenCalledWith({ kind: "legal", value: "affirm" });
  });

  it("constructs a general direction with position_id when required_direction_kind = 'general'", () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <ConclusionDirectionEditorRow
        editor={{
          node_id: "n2",
          current_direction_kind: "legal",
          required_direction_kind: "general",
          options: [{ value: "p1", label: "Plaintiff wins" }],
        }}
        conclusion_title="Verdict"
        current_value={undefined}
        onValueChanged={onChange}
        available_positions={[{ id: "p1", label: "Plaintiff wins" }]}
      />,
    );
    fireEvent.change(getByTestId("direction-select"), { target: { value: "p1" } });
    expect(onChange).toHaveBeenCalledWith({ kind: "general", position_id: "p1" });
  });

  it("renders current → required chip", () => {
    const { getByTestId } = render(
      <ConclusionDirectionEditorRow
        editor={{
          node_id: "n3",
          current_direction_kind: "general",
          required_direction_kind: "legal",
          options: [],
        }}
        conclusion_title="X"
        current_value={undefined}
        onValueChanged={() => {}}
      />,
    );
    expect(getByTestId("current-kind-chip").textContent).toBe("general → legal");
  });
});
