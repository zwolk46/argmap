// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SeverityIcon, severityFromValidation } from "@/ui/primitives/severity-icon";
import type { ValidationResult } from "@/schema";

describe("SeverityIcon", () => {
  it("renders pass glyph (✓)", () => {
    const { container } = render(<SeverityIcon severity="pass" />);
    expect(container.textContent).toContain("✓");
  });

  it("renders warning glyph (⚠)", () => {
    const { container } = render(<SeverityIcon severity="warning" />);
    expect(container.textContent).toContain("⚠");
  });

  it("renders error glyph (✕)", () => {
    const { container } = render(<SeverityIcon severity="error" />);
    expect(container.textContent).toContain("✕");
  });
});

describe("severityFromValidation", () => {
  it("returns pass for empty array", () => {
    expect(severityFromValidation([])).toBe("pass");
  });

  it("returns error on any error regardless of warnings", () => {
    const results: ValidationResult[] = [
      { rule_id: "r1", node_id: "n1", severity: "warning", message: "w" },
      { rule_id: "r2", node_id: "n2", severity: "error", message: "e" },
    ];
    expect(severityFromValidation(results)).toBe("error");
  });

  it("returns warning when only warnings", () => {
    const results: ValidationResult[] = [
      { rule_id: "r1", node_id: "n1", severity: "warning", message: "w" },
    ];
    expect(severityFromValidation(results)).toBe("warning");
  });
});
