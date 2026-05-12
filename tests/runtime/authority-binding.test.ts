import { describe, it, expect } from "vitest";
import { isBinding } from "@/runtime";
import type { Authority, Jurisdiction } from "@/schema";
import { authority as makeAuthority } from "./_fixtures";

const NY: Jurisdiction = { level: "state", region: "New York" };
const MA: Jurisdiction = { level: "state", region: "Massachusetts" };
const FED_9: Jurisdiction = { level: "federal", region: "9th Circuit" };

describe("isBinding — resolution order", () => {
  it("manual_override true → binding:true, exact, manual_override", () => {
    const a = makeAuthority("a", "Some Cite", { is_binding: true, jurisdiction: MA });
    const r = isBinding(a, NY);
    expect(r.binding).toBe(true);
    expect(r.source).toBe("manual_override");
    expect(r.certainty).toBe("exact");
  });

  it("manual_override false → binding:false, exact, manual_override", () => {
    const a = makeAuthority("a", "Some Cite", { is_binding: false, jurisdiction: NY });
    const r = isBinding(a, NY);
    expect(r.binding).toBe(false);
    expect(r.source).toBe("manual_override");
  });

  it("U.S. Supreme Court special case (string_match)", () => {
    const a = makeAuthority("a", "Marbury v. Madison", {
      court: "Supreme Court of the United States",
      jurisdiction: FED_9,
    });
    const r = isBinding(a, NY);
    expect(r.binding).toBe(true);
    expect(r.source).toBe("string_match");
    expect(r.certainty).toBe("heuristic");
  });

  it("Same level + same region → binding (string_match heuristic)", () => {
    const a = makeAuthority("a", "Cite", { jurisdiction: NY });
    const r = isBinding(a, NY);
    expect(r.binding).toBe(true);
    expect(r.source).toBe("string_match");
  });

  it("Different state regions → not binding (string_match)", () => {
    const a = makeAuthority("a", "Cite", { jurisdiction: MA });
    const r = isBinding(a, NY);
    expect(r.binding).toBe(false);
    expect(r.source).toBe("string_match");
  });

  it("Authority with no jurisdiction → no_jurisdiction", () => {
    const a = makeAuthority("a", "Cite");
    const r = isBinding(a, NY);
    expect(r.binding).toBe(false);
    expect(r.source).toBe("no_jurisdiction");
  });
});

describe("isBinding — purity", () => {
  it("identical inputs produce identical outputs across 100 calls", () => {
    const a: Authority = makeAuthority("a", "C", { jurisdiction: NY });
    const first = isBinding(a, NY);
    for (let i = 0; i < 100; i++) {
      expect(isBinding(a, NY)).toEqual(first);
    }
  });

  it("never throws", () => {
    const a: Authority = makeAuthority("a", "C");
    expect(() => isBinding(a, NY)).not.toThrow();
  });
});
