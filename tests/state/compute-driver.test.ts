import { describe, it, expect } from "vitest";
import { createComputeDriver } from "@/state";
import { makeSession } from "./_setup";

const TEST_NOW = "2026-05-10T00:00:00.000Z";

describe("createComputeDriver", () => {
  it("runFor uses provided at timestamp", () => {
    const driver = createComputeDriver({ now: () => "2099-01-01T00:00:00.000Z" });
    const session = makeSession();
    const result = driver.runFor(session, TEST_NOW);
    expect(result.output.computed_at).toBe(TEST_NOW);
  });

  it("runFor falls back to now() when at is omitted", () => {
    const driver = createComputeDriver({ now: () => TEST_NOW });
    const session = makeSession();
    const result = driver.runFor(session);
    expect(result.output.computed_at).toBe(TEST_NOW);
  });

  it("buildInput maps session fields to ComputeInput", () => {
    const driver = createComputeDriver({ now: () => TEST_NOW });
    const session = makeSession();
    const input = driver.buildInput(session, TEST_NOW);

    expect(input.computed_at).toBe(TEST_NOW);
    expect(input.frame_version_snapshot).toBe(session.frame_version_snapshot);
    expect(input.premises).toBe(session.premises);
    expect(input.checkpoint_responses).toBe(session.checkpoint_responses);
  });

  it("runFor returns a complete ComputeResult shape", () => {
    const driver = createComputeDriver({ now: () => TEST_NOW });
    const session = makeSession();
    const result = driver.runFor(session);

    expect(result).toHaveProperty("validation_results");
    expect(result).toHaveProperty("status_map");
    expect(result).toHaveProperty("output");
    expect(result).toHaveProperty("active_path");
    expect(result).toHaveProperty("open_gates");
  });
});
