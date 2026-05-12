import {
  type AutosaveController,
  type AutosaveEvent,
  type PendingFrameSave,
  type PendingSessionSave,
  type SaveEvent,
  type Unsubscribe,
  type Repository,
  type AppState,
  QuotaExceededError,
  RepositoryError,
} from "./repository";
import type { FrameId, SessionId } from "@/schema";

export const AUTOSAVE_IDLE_MS = 5_000;
export const AUTOSAVE_MAX_MS = 30_000;
export const APP_STATE_DEBOUNCE_MS = 1_000;

interface FrameSlot {
  payload: PendingFrameSave;
  idle_timer: ReturnType<typeof setTimeout> | null;
  max_timer: ReturnType<typeof setTimeout> | null;
  in_flight: boolean;
}
interface SessionSlot {
  payload: PendingSessionSave;
  idle_timer: ReturnType<typeof setTimeout> | null;
  max_timer: ReturnType<typeof setTimeout> | null;
  in_flight: boolean;
}

export interface AutosaveControllerOptions {
  repo: Repository;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}

export function createAutosaveController(opts: AutosaveControllerOptions): AutosaveController {
  return new AutosaveControllerImpl(opts);
}

class AutosaveControllerImpl implements AutosaveController {
  private readonly repo: Repository;
  private readonly setTimeoutFn: typeof setTimeout;
  private readonly clearTimeoutFn: typeof clearTimeout;
  private readonly frame_slots = new Map<FrameId, FrameSlot>();
  private readonly session_slots = new Map<SessionId, SessionSlot>();
  private app_state_payload: AppState | null = null;
  private app_state_timer: ReturnType<typeof setTimeout> | null = null;
  private app_state_in_flight = false;
  private readonly listeners: { [E in AutosaveEvent]: Set<(e: SaveEvent) => void> } = {
    save_succeeded: new Set(),
    save_failed: new Set(),
  };
  private disposed = false;

  constructor(opts: AutosaveControllerOptions) {
    this.repo = opts.repo;
    this.setTimeoutFn = opts.setTimeoutFn ?? setTimeout;
    this.clearTimeoutFn = opts.clearTimeoutFn ?? clearTimeout;
  }

  scheduleFrameSave(payload: PendingFrameSave): void {
    if (this.disposed) return;
    const id = payload.frame.id;
    const slot = this.frame_slots.get(id) ?? {
      payload,
      idle_timer: null,
      max_timer: null,
      in_flight: false,
    };
    slot.payload = payload;
    if (slot.idle_timer) this.clearTimeoutFn(slot.idle_timer);
    slot.idle_timer = this.setTimeoutFn(() => {
      void this.flushFrame(id);
    }, AUTOSAVE_IDLE_MS);
    if (!slot.max_timer) {
      slot.max_timer = this.setTimeoutFn(() => {
        void this.flushFrame(id);
      }, AUTOSAVE_MAX_MS);
    }
    this.frame_slots.set(id, slot);
  }

  scheduleSessionSave(payload: PendingSessionSave): void {
    if (this.disposed) return;
    const id = payload.session.id;
    const slot = this.session_slots.get(id) ?? {
      payload,
      idle_timer: null,
      max_timer: null,
      in_flight: false,
    };
    slot.payload = payload;
    if (slot.idle_timer) this.clearTimeoutFn(slot.idle_timer);
    slot.idle_timer = this.setTimeoutFn(() => {
      void this.flushSession(id);
    }, AUTOSAVE_IDLE_MS);
    if (!slot.max_timer) {
      slot.max_timer = this.setTimeoutFn(() => {
        void this.flushSession(id);
      }, AUTOSAVE_MAX_MS);
    }
    this.session_slots.set(id, slot);
  }

  scheduleAppStateSave(state: AppState): void {
    if (this.disposed) return;
    this.app_state_payload = state;
    if (this.app_state_timer) this.clearTimeoutFn(this.app_state_timer);
    this.app_state_timer = this.setTimeoutFn(() => {
      void this.flushAppState();
    }, APP_STATE_DEBOUNCE_MS);
  }

  async flushAll(): Promise<void> {
    const frame_ids = Array.from(this.frame_slots.keys()).sort();
    const session_ids = Array.from(this.session_slots.keys()).sort();
    const tasks: Promise<void>[] = [];
    for (const id of frame_ids) tasks.push(this.flushFrame(id));
    for (const id of session_ids) tasks.push(this.flushSession(id));
    if (this.app_state_payload) tasks.push(this.flushAppState());
    await Promise.allSettled(tasks);
  }

  async flushFrame(frame_id: FrameId): Promise<void> {
    const slot = this.frame_slots.get(frame_id);
    if (!slot) return;
    if (slot.in_flight) return;
    if (slot.idle_timer) {
      this.clearTimeoutFn(slot.idle_timer);
      slot.idle_timer = null;
    }
    if (slot.max_timer) {
      this.clearTimeoutFn(slot.max_timer);
      slot.max_timer = null;
    }
    const payload = slot.payload;
    slot.in_flight = true;
    try {
      const versioned = this.applyChangeSummary(payload);
      await this.repo.saveFrameVersion(versioned.new_version);
      this.emit("save_succeeded", {
        kind: "frame",
        id: frame_id,
        version_id: versioned.new_version.id,
      });
      this.frame_slots.delete(frame_id);
    } catch (e) {
      const err = e as Error;
      this.emit("save_failed", {
        kind: "frame",
        id: frame_id,
        error:
          err instanceof QuotaExceededError || err instanceof RepositoryError
            ? err
            : new RepositoryError("flushFrame", err.message),
      });
      slot.in_flight = false;
    }
  }

  async flushSession(session_id: SessionId): Promise<void> {
    const slot = this.session_slots.get(session_id);
    if (!slot) return;
    if (slot.in_flight) return;
    if (slot.idle_timer) {
      this.clearTimeoutFn(slot.idle_timer);
      slot.idle_timer = null;
    }
    if (slot.max_timer) {
      this.clearTimeoutFn(slot.max_timer);
      slot.max_timer = null;
    }
    const payload = slot.payload;
    slot.in_flight = true;
    try {
      const versioned = this.applySessionChangeSummary(payload);
      await this.repo.saveSessionVersion(versioned.new_version);
      this.emit("save_succeeded", {
        kind: "session",
        id: session_id,
        version_id: versioned.new_version.id,
      });
      this.session_slots.delete(session_id);
    } catch (e) {
      const err = e as Error;
      this.emit("save_failed", {
        kind: "session",
        id: session_id,
        error:
          err instanceof QuotaExceededError || err instanceof RepositoryError
            ? err
            : new RepositoryError("flushSession", err.message),
      });
      slot.in_flight = false;
    }
  }

  async flushAppState(): Promise<void> {
    if (!this.app_state_payload || this.app_state_in_flight) return;
    if (this.app_state_timer) {
      this.clearTimeoutFn(this.app_state_timer);
      this.app_state_timer = null;
    }
    const state = this.app_state_payload;
    this.app_state_payload = null;
    this.app_state_in_flight = true;
    try {
      await this.repo.saveAppState(state);
      this.emit("save_succeeded", { kind: "app_state" });
    } catch (e) {
      const err = e as Error;
      this.emit("save_failed", {
        kind: "app_state",
        error:
          err instanceof QuotaExceededError || err instanceof RepositoryError
            ? err
            : new RepositoryError("flushAppState", err.message),
      });
    } finally {
      this.app_state_in_flight = false;
    }
  }

  async saveFrameMilestone(payload: PendingFrameSave): Promise<void> {
    this.scheduleFrameSave(payload);
    await this.flushFrame(payload.frame.id);
  }

  async saveSessionMilestone(payload: PendingSessionSave): Promise<void> {
    this.scheduleSessionSave(payload);
    await this.flushSession(payload.session.id);
  }

  on(event: AutosaveEvent, listener: (info: SaveEvent) => void): Unsubscribe {
    this.listeners[event].add(listener);
    return () => {
      this.listeners[event].delete(listener);
    };
  }

  dispose(): void {
    this.disposed = true;
    for (const [, slot] of this.frame_slots) {
      if (slot.idle_timer) this.clearTimeoutFn(slot.idle_timer);
      if (slot.max_timer) this.clearTimeoutFn(slot.max_timer);
    }
    for (const [, slot] of this.session_slots) {
      if (slot.idle_timer) this.clearTimeoutFn(slot.idle_timer);
      if (slot.max_timer) this.clearTimeoutFn(slot.max_timer);
    }
    if (this.app_state_timer) this.clearTimeoutFn(this.app_state_timer);
    this.frame_slots.clear();
    this.session_slots.clear();
    this.listeners.save_succeeded.clear();
    this.listeners.save_failed.clear();
  }

  private applyChangeSummary(p: PendingFrameSave): PendingFrameSave {
    if (!p.change_summary) return p;
    return { ...p, new_version: { ...p.new_version, change_summary: p.change_summary } };
  }

  private applySessionChangeSummary(p: PendingSessionSave): PendingSessionSave {
    if (!p.change_summary) return p;
    return { ...p, new_version: { ...p.new_version, change_summary: p.change_summary } };
  }

  private emit(event: AutosaveEvent, info: SaveEvent): void {
    for (const listener of this.listeners[event]) {
      try {
        listener(info);
      } catch {
        /* listener errors are isolated */
      }
    }
  }
}
