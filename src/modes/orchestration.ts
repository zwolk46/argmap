import type { Frame, FrameVersion } from "@/schema";
import type { FrameId, FrameVersionId, SessionId, SessionVersionId } from "@/schema";
import type { ArgumentSessionVersion } from "@/schema";
import type { Repository, OrphanResolution } from "@/persistence";

export async function createFrameFromTemplate(
  repo: Repository,
  template_frame_id: FrameId,
  new_title: string,
): Promise<Frame> {
  return repo.createFrameFromTemplate(template_frame_id, new_title);
}

export async function migrateSession(
  repo: Repository,
  session_id: SessionId,
  target_frame_version_id: FrameVersionId,
  resolutions: OrphanResolution[],
): Promise<ArgumentSessionVersion> {
  return repo.migrateSession(session_id, target_frame_version_id, resolutions);
}

export async function restoreFrameVersion(
  repo: Repository,
  frame_id: FrameId,
  ancestor_version_id: FrameVersionId,
): Promise<FrameVersion> {
  return repo.restoreFrameVersion(frame_id, ancestor_version_id);
}

export async function restoreSessionVersion(
  repo: Repository,
  session_id: SessionId,
  ancestor_version_id: SessionVersionId,
): Promise<ArgumentSessionVersion> {
  return repo.restoreSessionVersion(session_id, ancestor_version_id);
}

// P0-25: The earlier orchestration-level `enumerateOrphanCandidates` and
// its `OrphanCandidate` type were dead code — nothing imported them through
// the live @/state path; the @/runtime version is canonical. The reattach
// heuristic that lived here has been ported into runtime/extras.ts where
// the suggested_kind/reattach_candidates fields actually flow into the UI.
