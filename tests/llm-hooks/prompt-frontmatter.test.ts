import { describe, it, expect } from "vitest";
import { parseFrontmatter, FrontmatterParseError } from "@/llm-hooks";

describe("parseFrontmatter", () => {
  it("splits a well-formed file into frontmatter + body", () => {
    const raw = "---\nhook_name: g1\nversion: v1\n---\nbody text\n";
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter).toEqual({ hook_name: "g1", version: "v1" });
    expect(body).toBe("body text\n");
  });

  it("throws on missing leading fence", () => {
    expect(() => parseFrontmatter("hook_name: g1\n")).toThrow(FrontmatterParseError);
  });

  it("throws on missing closing fence", () => {
    expect(() => parseFrontmatter("---\nhook_name: g1\nbody\n")).toThrow(FrontmatterParseError);
  });

  it("normalizes CRLF line endings (body also normalized)", () => {
    const raw = "---\r\nhook_name: g1\r\nversion: v1\r\n---\r\nbody\r\n";
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter.hook_name).toBe("g1");
    // Implementation normalizes entire input; body CRLF becomes LF
    expect(body).toBe("body\n");
  });

  it("throws on non-object YAML root", () => {
    expect(() => parseFrontmatter("---\n- item1\n- item2\n---\nbody\n")).toThrow(
      FrontmatterParseError,
    );
  });

  it("parses nested objects in frontmatter", () => {
    const raw = "---\nhook_name: test\nschema_in:\n  type: object\n---\nbody\n";
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.schema_in).toEqual({ type: "object" });
  });
});
