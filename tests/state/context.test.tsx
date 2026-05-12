// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  RepositoryProvider,
  useRepository,
  useFrameStore,
  useSessionStore,
  useAppStateStore,
} from "@/state";
import { createAutosaveController, createCrossTabBus, IndexedDbRepository } from "@/persistence";
import { makeFrameDispatch, makeSessionDispatch, injectedNow, injectedGenerateId } from "./_setup";
import type { LlmSettings } from "@/schema";

// happy-dom requires fake-indexeddb manually for these tests
import "fake-indexeddb/auto";

const TEST_NOW = "2026-05-10T00:00:00.000Z";

const DEFAULT_LLM_SETTINGS: LlmSettings = {
  build_time_hooks_enabled: false,
  runtime_hooks_enabled: false,
  output_time_hooks_enabled: false,
  invocations: [],
};

async function makeProviderProps() {
  const repo = new IndexedDbRepository({
    db_name: `ctx_test_${Math.random().toString(36).slice(2)}`,
    now: injectedNow(TEST_NOW),
    generateId: injectedGenerateId(),
  });
  await repo.openOrUpgrade();
  const autosave = createAutosaveController({ repo });
  const crosstab = createCrossTabBus();

  const props = {
    repo,
    autosave,
    crosstab,
    frame_dispatch: makeFrameDispatch(),
    session_dispatch: makeSessionDispatch(),
    llm_settings_default: DEFAULT_LLM_SETTINGS,
    now: injectedNow(TEST_NOW),
    generateId: injectedGenerateId(),
  };
  return { props, repo, autosave };
}

// AT-STATE-CTX-1: useRepository throws outside provider
describe("useRepository", () => {
  it("throws when used outside RepositoryProvider", () => {
    expect(() => renderHook(() => useRepository())).toThrow(
      "useRepository must be used inside <RepositoryProvider>",
    );
  });

  it("returns context value inside RepositoryProvider", async () => {
    const { props, repo } = await makeProviderProps();
    const { result } = renderHook(() => useRepository(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <RepositoryProvider {...props}>{children}</RepositoryProvider>
      ),
    });

    expect(result.current.repository).toBe(repo);
    expect(result.current.frame_store).toBeDefined();
    expect(result.current.session_store).toBeDefined();
    expect(result.current.app_state_store).toBeDefined();
    props.autosave.dispose();
    props.crosstab.close();
    repo.close();
  });
});

// AT-STATE-CTX-2: useFrameStore selector runs against snapshot
describe("useFrameStore", () => {
  it("returns null frame when no frame is loaded", async () => {
    const { props, repo } = await makeProviderProps();
    const { result } = renderHook(() => useFrameStore((s) => s.frame), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <RepositoryProvider {...props}>{children}</RepositoryProvider>
      ),
    });

    expect(result.current).toBeNull();
    props.autosave.dispose();
    props.crosstab.close();
    repo.close();
  });

  it("selector overload returns is_loading from snapshot", async () => {
    const { props, repo } = await makeProviderProps();
    const { result } = renderHook(() => useFrameStore((s) => s.is_loading), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <RepositoryProvider {...props}>{children}</RepositoryProvider>
      ),
    });

    expect(result.current).toBe(false);
    props.autosave.dispose();
    props.crosstab.close();
    repo.close();
  });
});

describe("useSessionStore", () => {
  it("returns null session when no session is loaded", async () => {
    const { props, repo } = await makeProviderProps();
    const { result } = renderHook(() => useSessionStore((s) => s.session), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <RepositoryProvider {...props}>{children}</RepositoryProvider>
      ),
    });

    expect(result.current).toBeNull();
    props.autosave.dispose();
    props.crosstab.close();
    repo.close();
  });
});

describe("useAppStateStore", () => {
  it("returns default app_state shape", async () => {
    const { props, repo } = await makeProviderProps();
    const { result } = renderHook(() => useAppStateStore((s) => s.app_state), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <RepositoryProvider {...props}>{children}</RepositoryProvider>
      ),
    });

    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current.recents)).toBe(true);
    props.autosave.dispose();
    props.crosstab.close();
    repo.close();
  });
});
