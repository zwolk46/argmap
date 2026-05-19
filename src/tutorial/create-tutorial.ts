/**
 * createTutorial — persist the tutorial fixture (frame + version + session +
 * session_version) via the Repository so the user has a real, openable
 * tutorial frame in their account. After the four writes resolve, the home
 * page navigates to argument-running with the returned ids.
 *
 * Why not on AppStateStore: this is a UI-driven one-shot action specific to
 * onboarding. Keeping it as a standalone function avoids growing the store
 * surface and the action's failure mode (a half-persisted tutorial) stays
 * close to the call site that can surface a toast.
 */
import type { FrameId, SessionId } from "@/schema";
import type { Repository } from "@/persistence";
import { buildTutorial, TUTORIAL_TITLE, type TutorialRoleMap } from "./fixture";

export interface CreateTutorialOpts {
  repo: Repository;
  now: () => string;
  generateId: () => string;
  /** Pulled from the auth context; used for created_by stamping. */
  user_id: string;
}

export interface CreateTutorialResult {
  frame_id: FrameId;
  session_id: SessionId;
  role_to_id: TutorialRoleMap;
}

const ROLE_MAP_STORAGE_KEY = "argmap.tutorial.role-map.v1";

/**
 * Persist the role-to-id map so the tour can target specific tutorial nodes
 * across navigation. sessionStorage is the right scope: tab-local, dropped
 * when the tab closes, survives in-tab refresh.
 */
export function saveTutorialRoleMap(map: TutorialRoleMap): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(ROLE_MAP_STORAGE_KEY, JSON.stringify(map));
}

export function readTutorialRoleMap(): TutorialRoleMap | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(ROLE_MAP_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TutorialRoleMap;
  } catch {
    return null;
  }
}

export function clearTutorialRoleMap(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(ROLE_MAP_STORAGE_KEY);
}

export async function createTutorial(opts: CreateTutorialOpts): Promise<CreateTutorialResult> {
  const { repo, now, generateId, user_id } = opts;

  // Idempotency: if a tutorial frame already exists in this account, reuse
  // it instead of duplicating. Without this, every click of "Try the
  // tutorial" wrote a new Palsgraf frame; bailing and clicking again gave
  // the user N copies.
  const frames = await repo.listFrames();
  const existing_frame_summary = frames.find((f) => f.title === TUTORIAL_TITLE);
  if (existing_frame_summary) {
    const existing_frame_id = existing_frame_summary.id as FrameId;
    const existing_sessions = await repo.listSessionsForFrame(existing_frame_id);
    const existing_session = existing_sessions[0];
    if (existing_session) {
      // We don't have the role-to-id map for an existing tutorial in this
      // tab (it lives in sessionStorage and may have been cleared). Read
      // the persisted map if present so the tour still anchors correctly.
      const persisted_map = readTutorialRoleMap();
      return {
        frame_id: existing_frame_id,
        session_id: existing_session.id as SessionId,
        role_to_id: persisted_map ?? ({} as TutorialRoleMap),
      };
    }
    // Frame exists but its tutorial session was deleted — fall through and
    // create a fresh frame+session pair so the user lands on a complete
    // tutorial.
  }

  const { frame, frame_version, session, session_version, role_to_id } = buildTutorial({
    now: now(),
    generateId,
    user_id,
  });

  // Order matters: parent records before children. Save frame, then its
  // version (which references frame.id), then the session (which references
  // both), then its version. If any step throws we best-effort clean up
  // what was written so the user isn't left with an orphaned half-frame
  // visible on Home that would crash on open.
  await repo.saveFrame(frame);
  try {
    await repo.saveFrameVersion(frame_version);
    await repo.saveSession(session);
    await repo.saveSessionVersion(session_version);
  } catch (err) {
    try {
      await repo.deleteFrame(frame.id);
    } catch {
      /* deletion best-effort; surface the original failure */
    }
    throw err;
  }

  saveTutorialRoleMap(role_to_id);

  return { frame_id: frame.id, session_id: session.id, role_to_id };
}
