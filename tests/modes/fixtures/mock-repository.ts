import type { Repository, AppState } from "@/persistence";

export interface MockRepository extends Repository {
  calls: Record<string, unknown[][]>;
}

export function mockRepository(overrides: Partial<Repository> = {}): MockRepository {
  const calls: Record<string, unknown[][]> = {};
  function record(method: string, args: unknown[]) {
    calls[method] ??= [];
    calls[method]!.push(args);
  }

  const noop = () => Promise.resolve(undefined as never);

  const mock: MockRepository = {
    calls,
    listFrames: () => Promise.resolve([]),
    loadFrame: async (...args) => {
      record("loadFrame", args);
      return overrides.loadFrame?.(...args) ?? noop();
    },
    saveFrame: async (...args) => {
      record("saveFrame", args);
      return overrides.saveFrame?.(...args) ?? Promise.resolve();
    },
    deleteFrame: async (...args) => {
      record("deleteFrame", args);
      return overrides.deleteFrame?.(...args) ?? Promise.resolve();
    },
    listFrameVersions: () => Promise.resolve([]),
    listFrameVersionSummaries: () => Promise.resolve([]),
    loadFrameVersion: async (...args) => {
      record("loadFrameVersion", args);
      return overrides.loadFrameVersion?.(...args) ?? noop();
    },
    saveFrameVersion: async (...args) => {
      record("saveFrameVersion", args);
      return overrides.saveFrameVersion?.(...args) ?? Promise.resolve();
    },
    listSessionsForFrame: () => Promise.resolve([]),
    loadSession: async (...args) => {
      record("loadSession", args);
      return overrides.loadSession?.(...args) ?? noop();
    },
    saveSession: async (...args) => {
      record("saveSession", args);
      return overrides.saveSession?.(...args) ?? Promise.resolve();
    },
    deleteSession: async (...args) => {
      record("deleteSession", args);
      return overrides.deleteSession?.(...args) ?? Promise.resolve();
    },
    listSessionVersions: () => Promise.resolve([]),
    listSessionVersionSummaries: () => Promise.resolve([]),
    loadSessionVersion: async (...args) => {
      record("loadSessionVersion", args);
      return overrides.loadSessionVersion?.(...args) ?? noop();
    },
    saveSessionVersion: async (...args) => {
      record("saveSessionVersion", args);
      return overrides.saveSessionVersion?.(...args) ?? Promise.resolve();
    },
    createBlankFrame: async (...args) => {
      record("createBlankFrame", args);
      return overrides.createBlankFrame?.(...args) ?? noop();
    },
    createFrameFromTemplate: async (...args) => {
      record("createFrameFromTemplate", args);
      return overrides.createFrameFromTemplate?.(...args) ?? noop();
    },
    migrateSession: async (...args) => {
      record("migrateSession", args);
      return overrides.migrateSession?.(...args) ?? noop();
    },
    restoreFrameVersion: async (...args) => {
      record("restoreFrameVersion", args);
      return overrides.restoreFrameVersion?.(...args) ?? noop();
    },
    restoreSessionVersion: async (...args) => {
      record("restoreSessionVersion", args);
      return overrides.restoreSessionVersion?.(...args) ?? noop();
    },
    loadAppState: () => Promise.resolve({} as AppState),
    saveAppState: () => Promise.resolve(),
    searchFrames: () => Promise.resolve([]),
    exportFrame: noop,
    exportSession: noop,
    importFrame: noop,
    importSession: noop,
    loadPrompt: () => Promise.resolve(null),
    savePrompt: () => Promise.resolve(),
  };
  return mock;
}
