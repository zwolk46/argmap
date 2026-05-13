import { describe, it, expect } from "vitest";
import {
  COACHMARK_IDS,
  COACHMARK_MESSAGES,
  FIRST_LAUNCH_COACHMARK_ID,
  isCoachmarkId,
  NEW_FEATURE_NOTICE_IDS,
} from "@/ui/onboarding";

describe("coachmark-registry", () => {
  it("FIRST_LAUNCH_COACHMARK_ID is in COACHMARK_IDS", () => {
    expect(COACHMARK_IDS).toContain(FIRST_LAUNCH_COACHMARK_ID);
  });

  it("every COACHMARK_ID has a corresponding message", () => {
    for (const id of COACHMARK_IDS) {
      expect(COACHMARK_MESSAGES[id]).toBeTruthy();
    }
  });

  it("isCoachmarkId returns true for valid ids", () => {
    expect(isCoachmarkId("welcome_screen")).toBe(true);
    expect(isCoachmarkId("inspector_open")).toBe(true);
  });

  it("isCoachmarkId returns false for unknown ids", () => {
    expect(isCoachmarkId("nonexistent")).toBe(false);
  });

  it("NEW_FEATURE_NOTICE_IDS is empty in v1", () => {
    expect(NEW_FEATURE_NOTICE_IDS).toEqual([]);
  });
});
