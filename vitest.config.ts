import { defineConfig } from "vitest/config";
import path from "node:path";

const FROZEN_CLOCK_ISO = "2026-05-10T00:00:00.000Z";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["tests/setup.ts", "tests/persistence/_setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"],
    fakeTimers: {
      toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval"],
      now: new Date(FROZEN_CLOCK_ISO).getTime(),
    },
  },
});
