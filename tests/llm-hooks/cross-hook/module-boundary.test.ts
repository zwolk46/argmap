import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { globSync } from "glob";
import path from "path";

// This test verifies that the runtime module does NOT import from llm-hooks,
// enforcing Article II § 2 (the determinism boundary).

describe("module-boundary: runtime must not import llm-hooks", () => {
  it("no file under src/runtime imports @/llm-hooks", () => {
    const runtimeDir = path.resolve(__dirname, "../../../src/runtime");
    const runtimeFiles = globSync("**/*.{ts,tsx}", { cwd: runtimeDir, absolute: true });
    expect(runtimeFiles.length).toBeGreaterThan(0); // sanity-check the glob found files

    const violations: string[] = [];
    for (const file of runtimeFiles) {
      const content = readFileSync(file, "utf-8");
      if (
        content.includes("@/llm-hooks") ||
        content.includes("../llm-hooks") ||
        content.includes("./llm-hooks")
      ) {
        violations.push(path.relative(runtimeDir, file));
      }
    }
    expect(
      violations,
      `runtime files that import llm-hooks: ${violations.join(", ")}`,
    ).toHaveLength(0);
  });

  it("no file under src/schema imports @/llm-hooks", () => {
    const schemaDir = path.resolve(__dirname, "../../../src/schema");
    const schemaFiles = globSync("**/*.{ts,tsx}", { cwd: schemaDir, absolute: true });
    const violations: string[] = [];
    for (const file of schemaFiles) {
      const content = readFileSync(file, "utf-8");
      if (content.includes("@/llm-hooks")) {
        violations.push(path.relative(schemaDir, file));
      }
    }
    expect(violations).toHaveLength(0);
  });
});
