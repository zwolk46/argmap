import { describe, it, expect } from "vitest";
import { renderTemplate } from "@/llm-hooks";

describe("renderTemplate", () => {
  it("simple variable substitution", () => {
    expect(renderTemplate("Hello {{name}}!", { name: "world" })).toBe("Hello world!");
  });

  it("section iteration over array of objects", () => {
    const result = renderTemplate("{{#items}}- {{label}}\n{{/items}}", {
      items: [{ label: "A" }, { label: "B" }],
    });
    expect(result).toBe("- A\n- B\n");
  });

  it("truthy-section gating", () => {
    expect(renderTemplate("{{#flag}}yes{{/flag}}", { flag: true })).toBe("yes");
    expect(renderTemplate("{{#flag}}yes{{/flag}}", { flag: false })).toBe("");
  });

  it("falsy-section gating (inverted)", () => {
    expect(renderTemplate("{{^flag}}no{{/flag}}", { flag: false })).toBe("no");
    expect(renderTemplate("{{^flag}}no{{/flag}}", { flag: true })).toBe("");
  });

  it("HTML escaping is disabled for LLM prompts", () => {
    const result = renderTemplate("{{content}}", { content: "<b>bold & italic</b>" });
    expect(result).toBe("<b>bold & italic</b>");
  });
});
