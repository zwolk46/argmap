import { sortedEntries, sortedKeys } from "@/runtime/iteration-helpers";

// Lightweight JSON Schema validator for the subset used in hook prompt
// frontmatter (schema_out). Supports: type (single or array), required,
// properties, items, enum, minLength, minItems, maxItems, minimum, maximum.
//
// Why an in-tree validator instead of ajv: the schemas declared in
// src/llm-hooks/prompts/*/v1.md are small and use only this subset. An
// in-tree dependency-free pass keeps bundle size flat and the failure
// messages tuned for hook output.
//
// F-04 (audit §12): every hook.parseOutput discards the schema_out arg
// passed by runHook. This module is the enforcement layer.

export interface SchemaValidationResult {
  ok: boolean;
  /** Dot/bracket path into the value (e.g. "interpretations[0].statement"). */
  path: string;
  /** Human-readable failure message (empty when ok). */
  message: string;
}

const OK: SchemaValidationResult = { ok: true, path: "", message: "" };

type JsonSchemaType = "string" | "number" | "integer" | "boolean" | "object" | "array" | "null";

function jsTypeOf(value: unknown): JsonSchemaType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "string" || t === "boolean") return t;
  if (t === "number") return Number.isInteger(value) ? "integer" : "number";
  if (t === "object") return "object";
  // function / symbol / undefined are never valid JSON
  return "null";
}

function typeMatches(value: unknown, expected: JsonSchemaType | JsonSchemaType[]): boolean {
  const actual = jsTypeOf(value);
  const list = Array.isArray(expected) ? expected : [expected];
  for (const t of list) {
    if (t === "number" && actual === "integer") return true;
    if (t === actual) return true;
  }
  return false;
}

function fail(path: string, message: string): SchemaValidationResult {
  return { ok: false, path, message };
}

export function validateAgainstSchema(
  value: unknown,
  schema: unknown,
  path = "",
): SchemaValidationResult {
  if (schema == null || typeof schema !== "object") return OK;
  const s = schema as Record<string, unknown>;

  // type
  if (s.type !== undefined) {
    const type = s.type as JsonSchemaType | JsonSchemaType[];
    if (!typeMatches(value, type)) {
      const expected = Array.isArray(type) ? type.join("|") : type;
      return fail(path || "(root)", `expected type ${expected}, got ${jsTypeOf(value)}`);
    }
  }

  // enum
  if (Array.isArray(s.enum)) {
    if (!s.enum.some((candidate) => deepEqual(candidate, value))) {
      return fail(
        path || "(root)",
        `value not in enum [${s.enum.map((v) => JSON.stringify(v)).join(", ")}]`,
      );
    }
  }

  // string constraints
  if (typeof value === "string") {
    if (typeof s.minLength === "number" && value.length < s.minLength) {
      return fail(path || "(root)", `string shorter than minLength ${s.minLength}`);
    }
    if (typeof s.maxLength === "number" && value.length > s.maxLength) {
      return fail(path || "(root)", `string longer than maxLength ${s.maxLength}`);
    }
  }

  // number constraints
  if (typeof value === "number") {
    if (typeof s.minimum === "number" && value < s.minimum) {
      return fail(path || "(root)", `number below minimum ${s.minimum}`);
    }
    if (typeof s.maximum === "number" && value > s.maximum) {
      return fail(path || "(root)", `number above maximum ${s.maximum}`);
    }
  }

  // array
  if (Array.isArray(value)) {
    if (typeof s.minItems === "number" && value.length < s.minItems) {
      return fail(path || "(root)", `array shorter than minItems ${s.minItems}`);
    }
    if (typeof s.maxItems === "number" && value.length > s.maxItems) {
      return fail(path || "(root)", `array longer than maxItems ${s.maxItems}`);
    }
    if (s.items && typeof s.items === "object") {
      for (let i = 0; i < value.length; i += 1) {
        const child = validateAgainstSchema(value[i], s.items, `${path}[${i}]`);
        if (!child.ok) return child;
      }
    }
  }

  // object
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(s.required)) {
      for (const key of s.required as string[]) {
        if (!(key in obj)) {
          return fail(path ? `${path}.${key}` : key, `required property missing`);
        }
      }
    }
    if (s.properties && typeof s.properties === "object") {
      const props = s.properties as Record<string, unknown>;
      for (const [key, subschema] of sortedEntries(props)) {
        if (key in obj) {
          const child = validateAgainstSchema(obj[key], subschema, path ? `${path}.${key}` : key);
          if (!child.ok) return child;
        }
      }
    }
  }

  return OK;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === "object" && typeof b === "object") {
    const ak = sortedKeys(a as Record<string, unknown>);
    const bk = sortedKeys(b as Record<string, unknown>);
    if (ak.length !== bk.length) return false;
    for (let i = 0; i < ak.length; i += 1) {
      if (ak[i] !== bk[i]) return false;
      if (
        !deepEqual((a as Record<string, unknown>)[ak[i]], (b as Record<string, unknown>)[bk[i]])
      ) {
        return false;
      }
    }
    return true;
  }
  return false;
}
