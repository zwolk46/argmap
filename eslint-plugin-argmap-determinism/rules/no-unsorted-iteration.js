// Article II § 2 / buildkit "Sort before iterate".
// Forbids iterating over the unsorted keys/values/entries of a Set, Map, or plain object
// inside src/runtime/. Iteration MUST go through sortedIter / sortedKeys / sortedEntries
// from `@/runtime/iteration-helpers` (or local re-exports of those helpers).
//
// What this rule flags:
//   - `Object.keys(x)`, `Object.values(x)`, `Object.entries(x)` calls
//   - `x.keys()`, `x.values()`, `x.entries()` calls (Map/Set iteration protocol)
//   - `for...of` over an expression whose callee is `.entries()` / `.values()` / `.keys()`
//   - `for...in` loops (always non-deterministic property order)
//
// What this rule allows:
//   - The same calls inside `iteration-helpers.ts` itself (the helpers internally sort).
//   - Calls to the helpers: `sortedKeys(x)`, `sortedIter(x)`, `sortedEntries(x)`.
//   - Iteration over arrays (`arr.entries()`, `arr.values()`, `Array.from()`).
//
// AST-level matching; no type inference. False positives on arrays must be silenced
// with `// eslint-disable-next-line argmap-determinism/no-unsorted-iteration` and a
// one-line justification (the linter prints a hint to that effect in its message).

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid unordered Set/Map/object iteration inside src/runtime/ (Article II § 2).",
    },
    schema: [],
    messages: {
      objectKeys:
        "Use sortedKeys/sortedEntries/sortedIter from @/runtime/iteration-helpers instead of {{call}}.",
      protoIter:
        "Use sortedKeys/sortedEntries/sortedIter from @/runtime/iteration-helpers instead of .{{name}}() on a non-array.",
      forIn: "for...in iterates in non-deterministic order; use sortedKeys() and a for...of loop.",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();
    // Helper file is its own implementation; allow.
    if (filename.includes("iteration-helpers")) return {};

    return {
      // for...in is forbidden inside runtime — its iteration order is non-deterministic
      // across realms, and there's no array-shaped exception worth carving.
      ForInStatement(node) {
        context.report({ node, messageId: "forIn" });
      },

      // Object.keys / Object.values / Object.entries
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression") return;
        if (callee.computed) return;
        const property = callee.property;
        if (property.type !== "Identifier") return;
        const name = property.name;

        // Object.keys(x), Object.values(x), Object.entries(x)
        if (
          callee.object.type === "Identifier" &&
          callee.object.name === "Object" &&
          (name === "keys" || name === "values" || name === "entries")
        ) {
          context.report({
            node,
            messageId: "objectKeys",
            data: { call: `Object.${name}()` },
          });
          return;
        }

        // .keys() / .values() / .entries() on something that's not Object.* —
        // could be Map/Set (forbidden) or array (allowed). AST-level only, so we
        // emit a diagnostic and require an inline disable for arrays.
        if (name === "keys" || name === "values" || name === "entries") {
          // Skip when the receiver is an ArrayExpression literal like `[1,2].entries()`.
          if (callee.object.type === "ArrayExpression") return;
          // Skip when the call is the direct argument to Array.from / [...spread]
          // wrapping that sorts — but we don't try to detect that here.
          context.report({
            node,
            messageId: "protoIter",
            data: { name },
          });
        }
      },
    };
  },
};

export default rule;
