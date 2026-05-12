// Vitest global setup. Frozen-clock configuration lives in vitest.config.ts
// (fakeTimers.now = 2026-05-10T00:00:00Z); this file exists so future test
// scaffolding (RTL cleanup, fake-indexeddb auto-install for integration tests)
// has a single landing spot.

import { beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    now: new Date("2026-05-10T00:00:00.000Z").getTime(),
  });
});
