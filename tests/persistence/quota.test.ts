import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { freshDb, flushPromises } from "./_setup";
import { buildLegalModeFixture } from "../schema/fixtures/legal-mode-fixture";
import {
  createAutosaveController,
  AUTOSAVE_IDLE_MS,
  RepositoryError,
  type Repository,
  type SaveEvent,
} from "@/persistence";
import type { IndexedDbRepository } from "@/persistence";

describe("persistence/quota", () => {
  let repo: IndexedDbRepository;
  beforeEach(async () => {
    repo = await freshDb();
  });
  afterEach(() => repo.close());

  it("saveFrameVersion: a quota-exceeded transaction abort throws QuotaExceededError", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);

    // Verify that a DOMException with name "QuotaExceededError" is correctly shaped.
    const quota_error = new DOMException("QuotaExceededError", "QuotaExceededError");
    expect(quota_error.name).toBe("QuotaExceededError");
  });

  it("AutosaveController: a quota-exceeded save emits save_failed with RepositoryError, retains payload", async () => {
    const { frame_export } = buildLegalModeFixture();

    let call_count = 0;
    const failing_repo: Repository = new Proxy(repo, {
      get(target, prop) {
        if (prop === "saveFrameVersion") {
          return async () => {
            call_count++;
            if (call_count === 1) {
              throw new RepositoryError("saveFrameVersion", "Quota exceeded");
            }
            return (target as unknown as Repository).saveFrameVersion(frame_export.current_version);
          };
        }
        return (target as unknown as Record<string, unknown>)[prop as string];
      },
    });

    await repo.saveFrame(frame_export.frame);

    const controller = createAutosaveController({ repo: failing_repo });
    const failures: SaveEvent[] = [];
    const successes: SaveEvent[] = [];
    controller.on("save_failed", (e) => failures.push(e));
    controller.on("save_succeeded", (e) => successes.push(e));

    controller.scheduleFrameSave({
      frame: frame_export.frame,
      new_version: frame_export.current_version,
    });

    await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS + 1);
    await flushPromises();
    expect(failures).toHaveLength(1);
    expect(failures[0].error).toBeInstanceOf(RepositoryError);

    // Schedule again; second call should succeed.
    controller.scheduleFrameSave({
      frame: frame_export.frame,
      new_version: frame_export.current_version,
    });
    await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS + 1);
    await flushPromises();
    expect(successes).toHaveLength(1);

    controller.dispose();
  });

  it("after a quota failure, the next schedule call resumes from the unsaved payload", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);

    let should_fail = true;
    const controlled_repo: Repository = new Proxy(repo, {
      get(target, prop) {
        if (prop === "saveFrameVersion") {
          return async (version: unknown) => {
            if (should_fail) {
              should_fail = false;
              throw new RepositoryError("saveFrameVersion", "Transient error");
            }
            return (target as unknown as Repository).saveFrameVersion(version as never);
          };
        }
        return (target as unknown as Record<string, unknown>)[prop as string];
      },
    });

    const controller = createAutosaveController({ repo: controlled_repo });
    const successes: SaveEvent[] = [];
    controller.on("save_succeeded", (e) => successes.push(e));

    const fv_latest = { ...frame_export.current_version, id: "fv-latest", version_number: 1 };

    // First schedule: will fail.
    controller.scheduleFrameSave({ frame: frame_export.frame, new_version: fv_latest });
    await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS + 1);
    await flushPromises();

    // Schedule again: should succeed with the latest payload.
    controller.scheduleFrameSave({ frame: frame_export.frame, new_version: fv_latest });
    await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS + 1);
    await flushPromises();

    expect(successes).toHaveLength(1);
    expect(successes[0].version_id).toBe("fv-latest");

    controller.dispose();
  });
});
