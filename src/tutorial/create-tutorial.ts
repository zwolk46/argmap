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
import { buildTutorial, type TutorialRoleMap } from "./fixture";

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

  const { frame, frame_version, session, session_version, role_to_id } = buildTutorial({
    now: now(),
    generateId,
    user_id,
  });

  // Order matters: parent records before children. Save frame, then its
  // version (which references frame.id), then the session (which references
  // both), then its version. If any step throws the partial write surfaces
  // to the caller's catch.
  await repo.saveFrame(frame);
  await repo.saveFrameVersion(frame_version);
  await repo.saveSession(session);
  await repo.saveSessionVersion(session_version);

  saveTutorialRoleMap(role_to_id);

  return { frame_id: frame.id, session_id: session.id, role_to_id };
}
