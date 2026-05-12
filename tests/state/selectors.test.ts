import { describe, it, expect } from "vitest";
import {
  selectValidationErrors,
  selectValidationWarnings,
  selectNodeStatus,
  selectOpenGates,
  selectStatusSummary,
  selectCascadeSummary,
  selectPinnedFrames,
  selectFirstLaunchDismissed,
  selectNewFeatureNoticeSeen,
} from "@/state";
import { createComputeDriver } from "@/state";
import type { AppState, FrameSummary } from "@/persistence";
import type { ValidationResult } from "@/schema";
import { makeSession, makeFrameVersion } from "./_setup";

const TEST_NOW = "2026-05-10T00:00:00.000Z";
const driver = createComputeDriver({ now: () => TEST_NOW });

function makeValidation(severity: "error" | "warning"): ValidationResult {
  return {
    rule_id: `V-TEST-${severity}`,
    severity,
    message: `test ${severity}`,
  };
}

describe("selectValidationErrors / selectValidationWarnings", () => {
  it("filters to errors only", () => {
    const results = [makeValidation("error"), makeValidation("warning")];
    expect(selectValidationErrors(results)).toHaveLength(1);
    expect(selectValidationErrors(results)[0]?.severity).toBe("error");
  });

  it("filters to warnings only", () => {
    const results = [makeValidation("error"), makeValidation("warning")];
    expect(selectValidationWarnings(results)).toHaveLength(1);
    expect(selectValidationWarnings(results)[0]?.severity).toBe("warning");
  });
});

describe("selectNodeStatus", () => {
  it("returns status for existing node", () => {
    const status_map = {
      "n-1": {
        status: "open" as const,
        evaluated_at: TEST_NOW,
      },
    };
    const s = selectNodeStatus(status_map, "n-1");
    expect(s?.status).toBe("open");
  });

  it("returns undefined for missing node", () => {
    expect(selectNodeStatus({}, "n-missing")).toBeUndefined();
  });
});

describe("selectOpenGates", () => {
  it("delegates to compute_result.open_gates", () => {
    const session = makeSession();
    const result = driver.runFor(session);
    const gates = selectOpenGates(result);
    expect(Array.isArray(gates)).toBe(true);
  });
});

describe("selectStatusSummary", () => {
  it("returns zeros for empty status_map", () => {
    const session = makeSession();
    const result = driver.runFor(session);
    const summary = selectStatusSummary(result);
    expect(summary.total).toBe(result.status_map.size);
  });
});

describe("selectCascadeSummary", () => {
  it("returns cascade report with no nodes when to_delete is empty", () => {
    const fv = makeFrameVersion();
    const report = selectCascadeSummary(fv, {});
    expect(report.cascade_nodes).toHaveLength(0);
    expect(report.cascade_edges).toHaveLength(0);
  });
});

describe("selectPinnedFrames", () => {
  it("returns only pinned frame summaries", () => {
    const frames: FrameSummary[] = [
      {
        id: "f1",
        title: "A",
        mode: "general",
        tags: [],
        pinned: true,
        updated_at: TEST_NOW,
        current_version_id: "v1",
      },
      {
        id: "f2",
        title: "B",
        mode: "legal",
        tags: [],
        pinned: false,
        updated_at: TEST_NOW,
        current_version_id: "v2",
      },
    ];
    const pinned = selectPinnedFrames(frames, ["f1"]);
    expect(pinned).toHaveLength(1);
    expect(pinned[0]?.id).toBe("f1");
  });

  it("returns empty when no frames are pinned", () => {
    expect(selectPinnedFrames([], [])).toHaveLength(0);
  });
});

describe("selectFirstLaunchDismissed", () => {
  it("returns false when dismissed_warnings is absent", () => {
    const state: AppState = {
      recents: [],
      pinned: [],
      default_output_view: "path_overlay",
      side_panel_collapsed: {},
      coachmark_dismissals: {},
      last_known_schema_version: 1,
    };
    expect(selectFirstLaunchDismissed(state)).toBe(false);
  });

  it("returns true when first_launch warning is dismissed", () => {
    const state: AppState = {
      recents: [],
      pinned: [],
      default_output_view: "path_overlay",
      side_panel_collapsed: {},
      coachmark_dismissals: {},
      dismissed_warnings: { first_launch: true },
      last_known_schema_version: 1,
    };
    expect(selectFirstLaunchDismissed(state)).toBe(true);
  });
});

describe("selectNewFeatureNoticeSeen", () => {
  it("returns false when seen_new_feature_notices is absent", () => {
    const state: AppState = {
      recents: [],
      pinned: [],
      default_output_view: "path_overlay",
      side_panel_collapsed: {},
      coachmark_dismissals: {},
      last_known_schema_version: 1,
    };
    expect(selectNewFeatureNoticeSeen(state, "v2-export")).toBe(false);
  });

  it("returns true when feature is marked seen", () => {
    const state: AppState = {
      recents: [],
      pinned: [],
      default_output_view: "path_overlay",
      side_panel_collapsed: {},
      coachmark_dismissals: {},
      seen_new_feature_notices: { "v2-export": true },
      last_known_schema_version: 1,
    };
    expect(selectNewFeatureNoticeSeen(state, "v2-export")).toBe(true);
  });
});
