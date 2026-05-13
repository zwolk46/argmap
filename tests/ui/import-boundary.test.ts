import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const UI_DIR = path.resolve(__dirname, "../../src/ui");

function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, acc);
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      acc.push(full);
    }
  }
  return acc;
}

const VALUE_IMPORT_RE =
  /^import\s+(?!type\s)[^'"]*from\s+['"](@\/runtime|@\/persistence|@\/modes)['"];?/gm;
const LLMHOOKS_VALUE_RE = /^import\s+(?!type\s)[^'"]*from\s+['"]@\/llm-hooks['"];?/gm;

describe("src/ui/ import boundary", () => {
  const files = collectFiles(UI_DIR);

  it("has at least 10 files (sanity check)", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const file of files) {
    const rel = path.relative(UI_DIR, file);
    it(`${rel} — no value imports from @/runtime, @/persistence, or @/modes`, () => {
      const content = fs.readFileSync(file, "utf8");
      const violations = [...content.matchAll(VALUE_IMPORT_RE)].map((m) => m[0]);
      expect(violations, `Violations in ${rel}`).toHaveLength(0);
    });

    it(`${rel} — no value imports from @/llm-hooks`, () => {
      const content = fs.readFileSync(file, "utf8");
      const violations = [...content.matchAll(LLMHOOKS_VALUE_RE)].map((m) => m[0]);
      expect(violations, `Violations in ${rel}`).toHaveLength(0);
    });
  }
});
