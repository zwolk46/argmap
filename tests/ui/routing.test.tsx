// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import { routeFromHash, hashFromRoute, navigate } from "@/ui/routing";
import type { Route } from "@/ui/routing";

describe("routeFromHash / hashFromRoute round-trip", () => {
  const cases: Route[] = [
    { kind: "home" },
    { kind: "frame_building", frame_id: "f-abc" },
    { kind: "argument_running", session_id: "s-xyz" },
  ];

  for (const route of cases) {
    it(`round-trips ${route.kind}`, () => {
      const hash = hashFromRoute(route);
      const back = routeFromHash(hash);
      expect(back).toEqual(route);
    });
  }

  it("returns Home for unrecognized hash", () => {
    expect(routeFromHash("#/unknown/path")).toEqual({ kind: "home" });
    expect(routeFromHash("")).toEqual({ kind: "home" });
  });
});

describe("navigate", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("updates window.location.hash for frame_building", () => {
    navigate({ kind: "frame_building", frame_id: "f-1" });
    expect(window.location.hash).toBe(hashFromRoute({ kind: "frame_building", frame_id: "f-1" }));
  });

  it("updates window.location.hash for home", () => {
    navigate({ kind: "home" });
    expect(window.location.hash).toBe(hashFromRoute({ kind: "home" }));
  });
});
