// Locks in the F-031 contract: the People v. Zach demo frame builds and
// validates clean against the schema rules. Any future schema/validation
// change that re-opens the gaps the F-031 amendment closed will surface here
// before it can land.
import { describe, it, expect } from "vitest";
import { runValidation } from "@/schema";
import type { Frame, FrameVersion } from "@/schema";
import { buildPeopleVZach } from "@/demo/people-v-zach";
import { seedPeopleVZach } from "@/demo/seed-people-v-zach";
import { mockRepository } from "../modes/fixtures/mock-repository";

function deterministicIdGen(): () => string {
  let n = 0;
  return () => {
    n += 1;
    return `pvz-${String(n).padStart(4, "0")}`;
  };
}

describe("demo/people-v-zach — frame integrity", () => {
  it("builds with the expected node and edge counts", () => {
    const { frame, frame_version } = buildPeopleVZach({
      now: "2026-05-21T00:00:00.000Z",
      generateId: deterministicIdGen(),
    });
    expect(frame.mode).toBe("legal");
    expect(frame.title).toContain("People v. Zach");
    // 44 nodes, 37 structural edges per the build script.
    expect(frame_version.nodes).toHaveLength(44);
    expect(frame_version.edges).toHaveLength(37);
  });

  it("validates with zero errors (F-031 amendment)", () => {
    const { frame_version } = buildPeopleVZach({
      now: "2026-05-21T00:00:00.000Z",
      generateId: deterministicIdGen(),
    });
    const results = runValidation(frame_version);
    const errors = results.filter((r) => r.severity === "error");
    if (errors.length > 0) {
      // Surface every error to make a future regression actionable.
      throw new Error(
        `Unexpected validation errors:\n${errors
          .map((e) => `  ${e.rule_id}: ${e.message}`)
          .join("\n")}`,
      );
    }
    expect(errors).toEqual([]);
  });

  it("the only expected warning is V-FR-7 (no jurisdictional SubQuestion)", () => {
    const { frame_version } = buildPeopleVZach({
      now: "2026-05-21T00:00:00.000Z",
      generateId: deterministicIdGen(),
    });
    const results = runValidation(frame_version);
    const warnings = results.filter((r) => r.severity === "warning");
    // Source spec § 1 doesn't model a jurisdictional SubQuestion; warning is
    // intentional and documents the absence rather than blocking the frame.
    expect(warnings.map((w) => w.rule_id)).toEqual(["V-FR-7"]);
  });
});

describe("demo/seed-people-v-zach — repository round-trip", () => {
  function makeRepoFakes(existing: Frame[] = []) {
    const saved_frames: Frame[] = [];
    const saved_versions: FrameVersion[] = [];
    const repo = mockRepository({
      saveFrame: async (f) => {
        saved_frames.push(f);
      },
      saveFrameVersion: async (v) => {
        saved_versions.push(v);
      },
    });
    // mockRepository's `listFrames` doesn't consult overrides — patch it
    // directly so the seeder's idempotency lookup sees what we want.
    repo.listFrames = async () => existing as Awaited<ReturnType<typeof repo.listFrames>>;
    return { repo, saved_frames, saved_versions };
  }

  it("persists frame + frame_version in parent-before-child order", async () => {
    const gen = deterministicIdGen();
    const { repo, saved_frames, saved_versions } = makeRepoFakes();
    const result = await seedPeopleVZach({
      repo,
      now: () => "2026-05-21T00:00:00.000Z",
      generateId: gen,
    });
    expect(result.reused).toBe(false);
    expect(saved_frames).toHaveLength(1);
    expect(saved_versions).toHaveLength(1);
    expect(saved_frames[0].id).toBe(result.frame_id);
    expect(saved_versions[0].frame_id).toBe(result.frame_id);
    expect(saved_versions[0].id).toBe(saved_frames[0].current_version_id);
  });

  it("is idempotent on title (reuses the existing frame)", async () => {
    const gen = deterministicIdGen();
    const existing_frame: Frame = {
      id: "existing-frame-id",
      title: "People v. Zach — Grand Larceny 2° (NY PL § 155.40)",
      mode: "legal",
      default_satisfaction_policies: {},
      tags: [],
      pinned: false,
      created_at: "t",
      updated_at: "t",
      current_version_id: "fv-existing",
    };
    const { repo } = makeRepoFakes([existing_frame]);
    const result = await seedPeopleVZach({
      repo,
      now: () => "2026-05-21T00:00:00.000Z",
      generateId: gen,
    });
    expect(result.reused).toBe(true);
    expect(result.frame_id).toBe("existing-frame-id");
    // Idempotency: no writes when reusing.
    expect(repo.calls.saveFrame ?? []).toHaveLength(0);
    expect(repo.calls.saveFrameVersion ?? []).toHaveLength(0);
  });

  it("rolls back the parent write if the version save fails", async () => {
    const gen = deterministicIdGen();
    const repo = mockRepository({
      saveFrameVersion: async () => {
        throw new Error("simulated version save failure");
      },
    });
    await expect(
      seedPeopleVZach({
        repo,
        now: () => "2026-05-21T00:00:00.000Z",
        generateId: gen,
      }),
    ).rejects.toThrow(/simulated version save failure/);
    expect(repo.calls.deleteFrame ?? []).toHaveLength(1);
  });
});
