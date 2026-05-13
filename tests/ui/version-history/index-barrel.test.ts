import { describe, it, expect } from "vitest";
import * as Barrel from "@/ui/version-history";

describe("@/ui/version-history barrel", () => {
  it("exports the documented public surfaces", () => {
    expect(typeof Barrel.VersionHistoryPane).toBe("function");
    expect(typeof Barrel.VersionHistoryPreviewProvider).toBe("function");
    expect(typeof Barrel.useVersionHistoryPreview).toBe("function");
    expect(typeof Barrel.VersionHistoryPreviewProviderMissingError).toBe("function");
    expect(typeof Barrel.FramePreviewView).toBe("function");
    expect(typeof Barrel.SessionPreviewView).toBe("function");
  });
});
