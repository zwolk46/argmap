#!/usr/bin/env node
// CI iteration-order audit.
//
// This is a coarser, file-level check that complements the ESLint rule. It scans
// every TypeScript file under src/runtime/ and counts occurrences of the four
// forbidden iteration patterns. Non-zero exit on any match. The ESLint rule
// reports per-site; this audit catches the case where a developer disables
// ESLint on a file and ships an unsorted iteration anyway.
//
// The helper file (iteration-helpers.ts) is the implementation of the sorted
// iteration; it is exempt from the audit.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const runtimeDir = join(repoRoot, "src", "runtime");

const PATTERNS = [
  { name: "Object.keys", re: /\bObject\.keys\s*\(/g },
  { name: "Object.values", re: /\bObject\.values\s*\(/g },
  { name: "Object.entries", re: /\bObject\.entries\s*\(/g },
  { name: "for...in", re: /\bfor\s*\(\s*(?:const|let|var)\s+\w+\s+in\b/g },
];

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  const out = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.isFile() && /\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const violations = [];
for (const file of await walk(runtimeDir)) {
  if (file.endsWith("iteration-helpers.ts")) continue;
  const text = await readFile(file, "utf8");
  for (const { name, re } of PATTERNS) {
    const matches = text.match(re);
    if (matches && matches.length > 0) {
      violations.push({ file, pattern: name, count: matches.length });
    }
  }
}

if (violations.length > 0) {
  console.error("iteration-order audit: forbidden patterns under src/runtime/:");
  for (const v of violations) console.error(`  ${v.file}: ${v.pattern} × ${v.count}`);
  console.error("\nUse sortedIter / sortedKeys / sortedEntries from @/runtime/iteration-helpers.");
  process.exit(1);
}

console.log("iteration-order audit: clean.");
