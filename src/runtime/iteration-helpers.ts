// Article II § 2 / buildkit "Sort before iterate".
//
// These four helpers are the only sanctioned way to iterate Set / Map / plain
// object inside src/runtime/. The ESLint rule argmap-determinism/no-unsorted-iteration
// flags every other form. The audit script (scripts/audit-iteration-order.mjs)
// re-checks at the file level on every PR.
//
// Sort key: lexicographic on the JSON-stringified key. For sortedIter over a Set,
// elements are compared with localeCompare on their JSON.stringify representation.
// Numeric keys sort lexicographically too — this is deliberate. Callers that need
// numeric ordering should compute it themselves; the runtime's determinism only
// requires *some* total order that is the same across machines/realms.

export function sortedKeys<T extends Record<string, unknown>>(obj: T): Array<keyof T & string> {
  const keys = Object.keys(obj) as Array<keyof T & string>;
  return keys.sort((a, b) => a.localeCompare(b));
}

export function sortedEntries<T extends Record<string, unknown>>(
  obj: T,
): Array<[keyof T & string, T[keyof T & string]]> {
  const keys = sortedKeys(obj);
  const out: Array<[keyof T & string, T[keyof T & string]]> = [];
  for (const k of keys) out.push([k, obj[k]]);
  return out;
}

export function sortedIter<T>(s: ReadonlySet<T>, keyFn?: (x: T) => string): T[];
export function sortedIter<T>(s: ReadonlyMap<unknown, T>): T[];
export function sortedIter<T>(
  s: ReadonlySet<T> | ReadonlyMap<unknown, T>,
  keyFn?: (x: T) => string,
): T[] {
  if (s instanceof Map) {
    const m = s as ReadonlyMap<unknown, T>;
    const keys = Array.from(m.keys()).sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b)),
    );
    const out: T[] = [];
    for (const k of keys) {
      const v = m.get(k);
      if (v !== undefined) out.push(v);
    }
    return out;
  }
  const set = s as ReadonlySet<T>;
  const arr = Array.from(set);
  if (keyFn) {
    return arr.sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
  }
  return arr.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

// Stable sort of a ReadonlyArray by a string key. Returns a fresh array.
// Used wherever the runtime iterates a ReadonlyArray whose source order is
// not already guaranteed deterministic (e.g., FrameVersion.nodes / edges,
// session.argument_edges, gate.inputs).
export function sortedBy<T>(xs: ReadonlyArray<T>, keyFn: (x: T) => string): T[] {
  return [...xs].sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
}
