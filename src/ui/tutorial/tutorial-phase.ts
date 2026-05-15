/**
 * Tutorial phase tracker. Uses sessionStorage so the tour state is
 * tab-local: closing the tab ends the tour, refreshing within the tab
 * resumes the user's phase. We deliberately don't persist this to the
 * Repository / Supabase because it's transient interaction state.
 */

const STORAGE_KEY = "argmap.tutorial.phase.v1";

export type TutorialPhase = "short" | "long" | "done";

type Listener = (phase: TutorialPhase | null) => void;
const listeners = new Set<Listener>();

export function getTutorialPhase(): TutorialPhase | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (raw === "short" || raw === "long" || raw === "done") return raw;
  return null;
}

export function setTutorialPhase(phase: TutorialPhase | null): void {
  if (typeof sessionStorage === "undefined") return;
  if (phase === null) sessionStorage.removeItem(STORAGE_KEY);
  else sessionStorage.setItem(STORAGE_KEY, phase);
  for (const fn of listeners) fn(phase);
}

export function subscribeTutorialPhase(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
