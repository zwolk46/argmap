import { describe, it, expect } from "vitest";
import { validateAgainstSchema } from "@/llm-hooks/schema-validate";

describe("validateAgainstSchema", () => {
  it("accepts a value against an empty / null schema", () => {
    expect(validateAgainstSchema("anything", {})).toMatchObject({ ok: true });
    expect(validateAgainstSchema(123, null)).toMatchObject({ ok: true });
    expect(validateAgainstSchema(null, undefined)).toMatchObject({ ok: true });
  });

  it("enforces top-level type", () => {
    expect(validateAgainstSchema(1, { type: "string" })).toMatchObject({
      ok: false,
      path: "(root)",
    });
    expect(validateAgainstSchema("x", { type: "string" })).toMatchObject({ ok: true });
    expect(validateAgainstSchema(1.5, { type: "number" })).toMatchObject({ ok: true });
    expect(validateAgainstSchema(1, { type: "integer" })).toMatchObject({ ok: true });
    expect(validateAgainstSchema(1.5, { type: "integer" })).toMatchObject({ ok: false });
  });

  it("supports union types", () => {
    expect(validateAgainstSchema(null, { type: ["string", "null"] })).toMatchObject({ ok: true });
    expect(validateAgainstSchema("x", { type: ["string", "null"] })).toMatchObject({ ok: true });
    expect(validateAgainstSchema(1, { type: ["string", "null"] })).toMatchObject({ ok: false });
  });

  it("enforces required properties on objects", () => {
    const schema = { type: "object", required: ["a"], properties: { a: { type: "string" } } };
    expect(validateAgainstSchema({ a: "x" }, schema)).toMatchObject({ ok: true });
    expect(validateAgainstSchema({}, schema)).toMatchObject({ ok: false, path: "a" });
  });

  it("recurses into nested properties with a precise error path", () => {
    const schema = {
      type: "object",
      required: ["outer"],
      properties: {
        outer: {
          type: "object",
          required: ["inner"],
          properties: { inner: { type: "string" } },
        },
      },
    };
    const bad = { outer: { inner: 42 } };
    const result = validateAgainstSchema(bad, schema);
    expect(result.ok).toBe(false);
    expect(result.path).toBe("outer.inner");
  });

  it("enforces items on arrays", () => {
    const schema = { type: "array", items: { type: "string" } };
    expect(validateAgainstSchema(["a", "b"], schema)).toMatchObject({ ok: true });
    const bad = validateAgainstSchema(["a", 2], schema);
    expect(bad.ok).toBe(false);
    expect(bad.path).toBe("[1]");
  });

  it("enforces minItems / maxItems", () => {
    expect(validateAgainstSchema(["x"], { type: "array", minItems: 2 })).toMatchObject({
      ok: false,
    });
    expect(validateAgainstSchema(["x", "y", "z"], { type: "array", maxItems: 2 })).toMatchObject({
      ok: false,
    });
    expect(
      validateAgainstSchema(["x", "y"], { type: "array", minItems: 2, maxItems: 2 }),
    ).toMatchObject({ ok: true });
  });

  it("enforces enum equality (including object enums)", () => {
    expect(validateAgainstSchema("warning", { enum: ["warning"] })).toMatchObject({ ok: true });
    expect(validateAgainstSchema("info", { enum: ["warning"] })).toMatchObject({ ok: false });
  });

  it("enforces string minLength / maxLength", () => {
    expect(validateAgainstSchema("ab", { type: "string", minLength: 3 })).toMatchObject({
      ok: false,
    });
    expect(validateAgainstSchema("abcd", { type: "string", maxLength: 3 })).toMatchObject({
      ok: false,
    });
    expect(
      validateAgainstSchema("abc", { type: "string", minLength: 3, maxLength: 3 }),
    ).toMatchObject({
      ok: true,
    });
  });

  it("validates the real interpretation_suggestion schema_out shape", () => {
    const schema = {
      type: "object",
      required: ["interpretations"],
      properties: {
        interpretations: {
          type: "array",
          items: {
            type: "object",
            required: ["statement"],
            properties: { statement: { type: "string" } },
          },
        },
      },
    };
    expect(validateAgainstSchema({ interpretations: [{ statement: "x" }] }, schema)).toMatchObject({
      ok: true,
    });
    // Missing required field deep inside an array item
    const bad = validateAgainstSchema({ interpretations: [{}] }, schema);
    expect(bad.ok).toBe(false);
    expect(bad.path).toBe("interpretations[0].statement");
  });
});
