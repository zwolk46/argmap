/**
 * One-shot seeder that persists the People v. Zach demo frame via the
 * Repository. Mirrors `createTutorial` from `src/tutorial/` but kept separate
 * because the demo frame is a real, editable artifact (not an onboarding
 * fixture). Idempotent on title: if an existing demo frame is found we
 * navigate to it instead of duplicating.
 */
import type { FrameId } from "@/schema";
import type { Repository } from "@/persistence";
import { buildPeopleVZach, PEOPLE_V_ZACH_TITLE } from "./people-v-zach";

export interface SeedPeopleVZachOpts {
  repo: Repository;
  now: () => string;
  generateId: () => string;
  user_id?: string;
}

export interface SeedPeopleVZachResult {
  frame_id: FrameId;
  reused: boolean;
}

export async function seedPeopleVZach(opts: SeedPeopleVZachOpts): Promise<SeedPeopleVZachResult> {
  const { repo, now, generateId, user_id } = opts;

  // Idempotency on title so repeated clicks don't fill the home page with
  // duplicates. The user can still delete and re-seed if they want a fresh
  // copy with different ids.
  const frames = await repo.listFrames();
  const existing = frames.find((f) => f.title === PEOPLE_V_ZACH_TITLE);
  if (existing) {
    return { frame_id: existing.id as FrameId, reused: true };
  }

  const { frame, frame_version } = buildPeopleVZach({
    now: now(),
    generateId,
    user_id,
  });

  // Parent-before-child write order (matches createTutorial). Best-effort
  // clean-up if the second write throws — leaves no half-frame on Home.
  await repo.saveFrame(frame);
  try {
    await repo.saveFrameVersion(frame_version);
  } catch (err) {
    try {
      await repo.deleteFrame(frame.id);
    } catch {
      /* swallow cleanup error; surface the original */
    }
    throw err;
  }

  return { frame_id: frame.id, reused: false };
}
