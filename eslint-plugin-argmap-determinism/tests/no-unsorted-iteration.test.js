// node:test smoke suite for the custom rule. Run with `node --test`.
//
// We construct a minimal ESLint instance, lint two snippets, and assert that the
// expected diagnostics fire. The rule's contract is at the AST level; this test
// pins the user-visible behavior.

import { test } from "node:test";
import assert from "node:assert/strict";
import { Linter } from "eslint";
import plugin from "../index.js";

const linter = new Linter();

function lint(code) {
  return linter.verify(code, {
    languageOptions: { ecmaVersion: 2022, sourceType: "module" },
    plugins: { "argmap-determinism": plugin },
    rules: { "argmap-determinism/no-unsorted-iteration": "error" },
  });
}

test("flags Object.keys / Object.values / Object.entries", () => {
  const messages = lint(`
    const x = { a: 1 };
    Object.keys(x);
    Object.values(x);
    Object.entries(x);
  `);
  assert.equal(messages.length, 3);
  assert.ok(messages.every((m) => m.ruleId === "argmap-determinism/no-unsorted-iteration"));
});

test("flags .keys() / .values() / .entries() prototype calls", () => {
  const messages = lint(`
    const m = new Map();
    for (const k of m.keys()) {}
    for (const v of m.values()) {}
    for (const [k, v] of m.entries()) {}
  `);
  assert.equal(messages.length, 3);
});

test("flags for...in", () => {
  const messages = lint(`
    const x = { a: 1 };
    for (const k in x) { void k; }
  `);
  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /non-deterministic/);
});

test("allows sortedKeys / sortedIter / sortedEntries calls", () => {
  const messages = lint(`
    import { sortedKeys, sortedIter, sortedEntries } from "@/runtime/iteration-helpers";
    const x = { a: 1 };
    sortedKeys(x);
    sortedIter(x);
    sortedEntries(x);
  `);
  assert.equal(messages.length, 0);
});

test("does not flag iteration over array literals", () => {
  const messages = lint(`
    for (const [i, v] of [1, 2, 3].entries()) { void i; void v; }
  `);
  assert.equal(messages.length, 0);
});
