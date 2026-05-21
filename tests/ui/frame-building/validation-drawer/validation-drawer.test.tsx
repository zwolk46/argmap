// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { FrameStoreSnapshot } from "@/state";
import type { ValidationResult } from "@/schema";

// We need to set up mocks before importing the component under test.

type AppStateBase = {
  app_state: {
    recents: string[];
    pinned: string[];
    default_output_view: "path_overlay";
    side_panel_collapsed: Record<string, unknown>;
    coachmark_dismissals: Record<string, unknown>;
    last_known_schema_version: number;
    dismissed_warnings: Record<string, boolean>;
  };
  frames: unknown[];
  is_loading: boolean;
  error: null;
};

let MOCK_APP_STATE: AppStateBase = {
  app_state: {
    recents: [],
    pinned: [],
    default_output_view: "path_overlay" as const,
    side_panel_collapsed: {},
    coachmark_dismissals: {},
    last_known_schema_version: 1,
    dismissed_warnings: {},
  },
  frames: [],
  is_loading: false,
  error: null,
};

// Mutable snapshot so each test can override validation entries
let MOCK_FRAME_SNAPSHOT: FrameStoreSnapshot = {
  frame: { id: "f1" } as FrameStoreSnapshot["frame"],
  frame_version: null,
  validation: [],
  is_loading: false,
  error: null,
  pending_suggestion: null,
  suggestion_status: "idle",
};

vi.mock("@/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state")>();
  return {
    ...actual,
    useFrameStore: vi.fn((selector: (s: FrameStoreSnapshot) => unknown) =>
      selector(MOCK_FRAME_SNAPSHOT),
    ),
    useAppStateStore: vi.fn((selector: (s: AppStateBase) => unknown) => selector(MOCK_APP_STATE)),
    useRepository: vi.fn(() => ({
      frame_store: {
        getState: () => ({ applyPatch: vi.fn() }),
      },
      app_state_store: {
        getState: () => ({ dismissWarning: vi.fn(), undismissWarning: vi.fn() }),
      },
    })),
  };
});

import { ValidationDrawer } from "@/ui/frame-building/validation-drawer/validation-drawer";

function makeError(rule_id: string): ValidationResult {
  return { rule_id, severity: "error", message: `Error: ${rule_id}`, node_id: "n1" };
}

function makeWarning(rule_id: string): ValidationResult {
  return { rule_id, severity: "warning", message: `Warning: ${rule_id}`, node_id: "n1" };
}

describe("ValidationDrawer", () => {
  beforeEach(() => {
    MOCK_FRAME_SNAPSHOT = {
      ...MOCK_FRAME_SNAPSHOT,
      validation: [],
    };
    MOCK_APP_STATE = {
      ...MOCK_APP_STATE,
      app_state: {
        ...MOCK_APP_STATE.app_state,
        dismissed_warnings: {},
      },
    };
  });

  it("renders 'No validation issues' when entries is empty", () => {
    // Sheet portals to document.body — query via screen, not container.
    render(<ValidationDrawer open on_close={() => {}} on_jump_to_node={() => {}} />);
    expect(screen.getByText("No validation issues")).toBeTruthy();
  });

  it("renders errors section when errors are present", () => {
    MOCK_FRAME_SNAPSHOT = {
      ...MOCK_FRAME_SNAPSHOT,
      validation: [makeError("V-FR-1"), makeError("V-FR-2")],
    };
    render(<ValidationDrawer open on_close={() => {}} on_jump_to_node={() => {}} />);
    expect(screen.getByText("Errors")).toBeTruthy();
    expect(screen.getByText("Error: V-FR-1")).toBeTruthy();
    expect(screen.getByText("Error: V-FR-2")).toBeTruthy();
  });

  it("errors render before warnings in the document", () => {
    MOCK_FRAME_SNAPSHOT = {
      ...MOCK_FRAME_SNAPSHOT,
      validation: [makeWarning("V-W-1"), makeError("V-E-1")],
    };
    render(<ValidationDrawer open on_close={() => {}} on_jump_to_node={() => {}} />);
    // Sheet portals — query the whole document for listitems.
    const all_messages = document.body.querySelectorAll('[role="listitem"]');
    const texts = Array.from(all_messages).map((el) => el.textContent ?? "");
    const error_idx = texts.findIndex((t) => t.includes("V-E-1"));
    const warning_idx = texts.findIndex((t) => t.includes("V-W-1"));
    expect(error_idx).toBeLessThan(warning_idx);
  });

  it("renders dismissed warnings subgroup toggle when dismissed warnings exist (P0-20)", () => {
    const warning = makeWarning("V-W-1");
    // Use the REAL frame.id ("f1") to build the key, not the literal "frame".
    // Before P0-20, the partition used the literal default and missed any
    // dismissed entry keyed under a real frame_id.
    const dismissed_key = "f1::V-W-1::n1";
    MOCK_FRAME_SNAPSHOT = {
      ...MOCK_FRAME_SNAPSHOT,
      validation: [warning],
    };
    MOCK_APP_STATE = {
      ...MOCK_APP_STATE,
      app_state: {
        ...MOCK_APP_STATE.app_state,
        dismissed_warnings: { [dismissed_key]: true },
      },
    };

    render(<ValidationDrawer open on_close={() => {}} on_jump_to_node={() => {}} />);
    expect(screen.getByText(/Dismissed/)).toBeTruthy();
  });
});
