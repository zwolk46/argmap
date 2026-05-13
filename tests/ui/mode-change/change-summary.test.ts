import { describe, it, expect } from "vitest";
import { buildModeChangeSummary } from "@/ui/mode-change";

describe("buildModeChangeSummary", () => {
  it("legal → general+personal", () => {
    expect(buildModeChangeSummary("legal", undefined, "general", "personal")).toBe(
      "mode changed: legal → general (personal)",
    );
  });

  it("legal → general+academic", () => {
    expect(buildModeChangeSummary("legal", undefined, "general", "academic")).toBe(
      "mode changed: legal → general (academic)",
    );
  });

  it("general+personal → legal", () => {
    expect(buildModeChangeSummary("general", "personal", "legal", undefined)).toBe(
      "mode changed: general (personal) → legal",
    );
  });

  it("general+academic → legal", () => {
    expect(buildModeChangeSummary("general", "academic", "legal", undefined)).toBe(
      "mode changed: general (academic) → legal",
    );
  });
});
