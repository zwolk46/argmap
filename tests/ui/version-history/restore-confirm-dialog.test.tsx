// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { RestoreConfirmDialog } from "@/ui/version-history/restore-confirm-dialog";

const mockRestoreFrameVersion = vi.fn().mockResolvedValue(undefined);
const mockRestoreSessionVersion = vi.fn().mockResolvedValue(undefined);
const mockListSessionsForFrame = vi.fn();

// Stable references prevent infinite re-render loops: the dialog's session
// fetch effect lists `repository` in its deps, and a fresh object per render
// (which `vi.fn(() => ({...}))` would produce) re-fires the effect forever.
const stableRepository = { listSessionsForFrame: mockListSessionsForFrame };
const stableValue = {
  frame_store: { getState: () => ({ restoreVersion: mockRestoreFrameVersion }) },
  session_store: { getState: () => ({ restoreVersion: mockRestoreSessionVersion }) },
  repository: stableRepository,
};

vi.mock("@/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state")>();
  return {
    ...actual,
    useRepository: vi.fn(() => stableValue),
  };
});

// Flush the microtask queue twice: once for the listSessionsForFrame
// promise to settle, once for setAffectedSessions' re-render commit.
// happy-dom + react 18 don't always let `findByTestId`'s internal waitFor
// race the fetch promise to completion before the 5s timeout — explicit
// act() wrapping is the reliable form here.
async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("RestoreConfirmDialog", () => {
  beforeEach(() => {
    mockRestoreFrameVersion.mockClear();
    mockRestoreSessionVersion.mockClear();
    mockListSessionsForFrame.mockReset();
  });

  it("renders the standard branching copy when open", async () => {
    mockListSessionsForFrame.mockResolvedValue([]);
    const { getByTestId } = render(
      <RestoreConfirmDialog
        open
        onClose={() => {}}
        entity_kind="frame"
        ancestor_version_id={"v-3" as never}
        ancestor_version_number={3}
        current_version_number={5}
        frame_id={"f-1" as never}
        on_restored={() => {}}
      />,
    );
    await flush();
    const body = getByTestId("restore-confirm-body");
    expect(body.textContent).toContain("Restoring version 3");
    expect(body.textContent).toContain("(v6)");
  });

  it("§8 #2: shows the affected-sessions advisory for frame restores when 1+ sessions exist", async () => {
    mockListSessionsForFrame.mockResolvedValue([{ id: "s-1" }, { id: "s-2" }, { id: "s-3" }]);
    const { getByTestId } = render(
      <RestoreConfirmDialog
        open
        onClose={() => {}}
        entity_kind="frame"
        ancestor_version_id={"v-2" as never}
        ancestor_version_number={2}
        current_version_number={4}
        frame_id={"f-1" as never}
        on_restored={() => {}}
      />,
    );
    await flush();
    const advisory = getByTestId("restore-confirm-sessions-advisory");
    expect(advisory.textContent).toContain("3 argument sessions");
    expect(mockListSessionsForFrame).toHaveBeenCalledWith("f-1");
  });

  it("§8 #2: pluralizes correctly for a single affected session", async () => {
    mockListSessionsForFrame.mockResolvedValue([{ id: "s-1" }]);
    const { getByTestId } = render(
      <RestoreConfirmDialog
        open
        onClose={() => {}}
        entity_kind="frame"
        ancestor_version_id={"v-2" as never}
        ancestor_version_number={2}
        current_version_number={4}
        frame_id={"f-1" as never}
        on_restored={() => {}}
      />,
    );
    await flush();
    const advisory = getByTestId("restore-confirm-sessions-advisory");
    expect(advisory.textContent).toContain("1 argument session");
    expect(advisory.textContent).not.toContain("1 argument sessions");
  });

  it("§8 #2: omits the advisory when zero sessions are affected", async () => {
    mockListSessionsForFrame.mockResolvedValue([]);
    const { queryByTestId } = render(
      <RestoreConfirmDialog
        open
        onClose={() => {}}
        entity_kind="frame"
        ancestor_version_id={"v-2" as never}
        ancestor_version_number={2}
        current_version_number={4}
        frame_id={"f-1" as never}
        on_restored={() => {}}
      />,
    );
    await flush();
    expect(mockListSessionsForFrame).toHaveBeenCalledWith("f-1");
    expect(queryByTestId("restore-confirm-sessions-advisory")).toBeNull();
  });

  it("§8 #2: does not fetch sessions for a session restore", async () => {
    const { queryByTestId } = render(
      <RestoreConfirmDialog
        open
        onClose={() => {}}
        entity_kind="session"
        ancestor_version_id={"sv-2" as never}
        ancestor_version_number={2}
        current_version_number={4}
        on_restored={() => {}}
      />,
    );
    await flush();
    expect(mockListSessionsForFrame).not.toHaveBeenCalled();
    expect(queryByTestId("restore-confirm-sessions-advisory")).toBeNull();
  });

  it("§8 #2: does not fetch sessions when frame_id is missing for a frame restore", async () => {
    const { queryByTestId } = render(
      <RestoreConfirmDialog
        open
        onClose={() => {}}
        entity_kind="frame"
        ancestor_version_id={"v-2" as never}
        ancestor_version_number={2}
        current_version_number={4}
        on_restored={() => {}}
      />,
    );
    await flush();
    expect(mockListSessionsForFrame).not.toHaveBeenCalled();
    expect(queryByTestId("restore-confirm-sessions-advisory")).toBeNull();
  });

  it("§8 #2: suppresses the advisory if listSessionsForFrame rejects", async () => {
    mockListSessionsForFrame.mockRejectedValue(new Error("offline"));
    const { queryByTestId } = render(
      <RestoreConfirmDialog
        open
        onClose={() => {}}
        entity_kind="frame"
        ancestor_version_id={"v-2" as never}
        ancestor_version_number={2}
        current_version_number={4}
        frame_id={"f-1" as never}
        on_restored={() => {}}
      />,
    );
    await flush();
    expect(mockListSessionsForFrame).toHaveBeenCalledWith("f-1");
    expect(queryByTestId("restore-confirm-sessions-advisory")).toBeNull();
  });

  it("§8 #2: resets the affected-sessions state when the dialog closes", async () => {
    mockListSessionsForFrame.mockResolvedValue([{ id: "s-1" }, { id: "s-2" }]);
    const { getByTestId, queryByTestId, rerender } = render(
      <RestoreConfirmDialog
        open
        onClose={() => {}}
        entity_kind="frame"
        ancestor_version_id={"v-2" as never}
        ancestor_version_number={2}
        current_version_number={4}
        frame_id={"f-1" as never}
        on_restored={() => {}}
      />,
    );
    await flush();
    expect(getByTestId("restore-confirm-sessions-advisory")).toBeTruthy();
    // ConfirmDialog returns null when open=false, so the advisory unmounts.
    rerender(
      <RestoreConfirmDialog
        open={false}
        onClose={() => {}}
        entity_kind="frame"
        ancestor_version_id={"v-2" as never}
        ancestor_version_number={2}
        current_version_number={4}
        frame_id={"f-1" as never}
        on_restored={() => {}}
      />,
    );
    expect(queryByTestId("restore-confirm-sessions-advisory")).toBeNull();
  });
});
