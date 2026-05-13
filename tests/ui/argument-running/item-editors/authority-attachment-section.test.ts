import { describe, it, expect } from "vitest";
import { authorityPickerVisible } from "@/ui/argument-running/item-editors/authority-attachment-section";

describe("authorityPickerVisible", () => {
  it("is true in legal mode regardless of flavor", () => {
    expect(authorityPickerVisible("legal", undefined)).toBe(true);
    expect(authorityPickerVisible("legal", "academic")).toBe(true);
    expect(authorityPickerVisible("legal", "personal")).toBe(true);
  });
  it("is true in academic flavor", () => {
    expect(authorityPickerVisible("general", "academic")).toBe(true);
  });
  it("is false in personal flavor without opt-in", () => {
    expect(authorityPickerVisible("general", "personal", false)).toBe(false);
  });
  it("is true in personal flavor with opt-in", () => {
    expect(authorityPickerVisible("general", "personal", true)).toBe(true);
  });
  it("is true in general mode with no flavor", () => {
    expect(authorityPickerVisible("general", undefined)).toBe(true);
  });
});
