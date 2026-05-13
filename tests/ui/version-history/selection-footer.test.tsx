// @vitest-environment happy-dom
import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { SelectionFooter } from "@/ui/version-history/selection-footer";

type FooterProps = React.ComponentProps<typeof SelectionFooter>;

function defaultProps(overrides: Partial<FooterProps> = {}): FooterProps {
  return {
    selected_version_id: null,
    selected_version_number: null,
    current_version_id: "v_current" as FooterProps["current_version_id"],
    current_version_number: 7,
    allow_restore: true,
    on_preview_clicked: () => {},
    on_restore_clicked: () => {},
    on_compare_clicked: () => {},
    ...overrides,
  };
}

describe("SelectionFooter", () => {
  it("disables all three buttons and labels 'Select a version' when nothing is selected", () => {
    const { getByTestId } = render(<SelectionFooter {...defaultProps()} />);
    expect(getByTestId("footer-preview").hasAttribute("disabled")).toBe(true);
    expect(getByTestId("footer-restore").hasAttribute("disabled")).toBe(true);
    expect(getByTestId("footer-compare").hasAttribute("disabled")).toBe(true);
    expect(getByTestId("selection-label").textContent).toContain("Select a version");
  });

  it("disables Preview/Restore/Compare when selection equals current", () => {
    const { getByTestId } = render(
      <SelectionFooter
        {...defaultProps({
          selected_version_id: "v_current" as FooterProps["selected_version_id"],
          selected_version_number: 7,
        })}
      />,
    );
    expect(getByTestId("footer-preview").hasAttribute("disabled")).toBe(true);
    expect(getByTestId("footer-restore").hasAttribute("disabled")).toBe(true);
    expect(getByTestId("footer-compare").hasAttribute("disabled")).toBe(true);
  });

  it("disables Restore (only) when allow_restore is false", () => {
    const { getByTestId } = render(
      <SelectionFooter
        {...defaultProps({
          selected_version_id: "v_old" as FooterProps["selected_version_id"],
          selected_version_number: 3,
          allow_restore: false,
        })}
      />,
    );
    expect(getByTestId("footer-preview").hasAttribute("disabled")).toBe(false);
    expect(getByTestId("footer-restore").hasAttribute("disabled")).toBe(true);
    expect(getByTestId("footer-restore").getAttribute("title")).toContain("Restore frame versions");
    expect(getByTestId("footer-compare").hasAttribute("disabled")).toBe(false);
  });

  it("Compare button label includes the current version number", () => {
    const { getByTestId } = render(
      <SelectionFooter
        {...defaultProps({
          selected_version_id: "v_old" as FooterProps["selected_version_id"],
          selected_version_number: 3,
        })}
      />,
    );
    expect(getByTestId("footer-compare").textContent).toContain("v7");
  });

  it("clicking enabled buttons dispatches their callbacks", () => {
    const on_preview_clicked = vi.fn();
    const on_restore_clicked = vi.fn();
    const on_compare_clicked = vi.fn();
    const { getByTestId } = render(
      <SelectionFooter
        {...defaultProps({
          selected_version_id: "v_old" as FooterProps["selected_version_id"],
          selected_version_number: 3,
          on_preview_clicked,
          on_restore_clicked,
          on_compare_clicked,
        })}
      />,
    );
    fireEvent.click(getByTestId("footer-preview"));
    fireEvent.click(getByTestId("footer-restore"));
    fireEvent.click(getByTestId("footer-compare"));
    expect(on_preview_clicked).toHaveBeenCalled();
    expect(on_restore_clicked).toHaveBeenCalled();
    expect(on_compare_clicked).toHaveBeenCalled();
  });
});
