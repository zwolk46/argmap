import { describe, it, expect } from "vitest";
import {
  migrate,
  MIGRATION_REGISTRY,
  CURRENT_SCHEMA_VERSION,
  runValidation,
  type FrameExport,
  type ArgumentSessionExport,
} from "@/schema";
import { buildLegalModeFixture } from "./fixtures/legal-mode-fixture";

describe("schema/round-trip", () => {
  it("a legal-mode FrameExport round-trips identically through JSON serialize/parse", () => {
    const exp: FrameExport = buildLegalModeFixture().frame_export;
    const json = JSON.stringify(exp);
    const parsed = JSON.parse(json) as FrameExport;
    expect(parsed).toStrictEqual(exp);
  });

  it("a current-version envelope passes migrate() unchanged", () => {
    const exp: FrameExport = buildLegalModeFixture().frame_export;
    const migrated = migrate(
      exp as unknown as { schema_version: number } & Record<string, unknown>,
      MIGRATION_REGISTRY,
    );
    expect(migrated).toStrictEqual(exp);
  });

  it("a current-version envelope passes runValidation() with zero errors", () => {
    const { frame_export, session_export } = buildLegalModeFixture();
    const results = runValidation(frame_export.current_version, session_export.session);
    const errors = results.filter((r) => r.severity === "error");
    expect(errors).toEqual([]);
  });

  it("an ArgumentSessionExport with embedded frame round-trips identically", () => {
    const { session_export } = buildLegalModeFixture();
    const exp: ArgumentSessionExport = session_export;
    expect(JSON.parse(JSON.stringify(exp))).toStrictEqual(exp);
  });

  it("schema_version on a fresh export equals CURRENT_SCHEMA_VERSION", () => {
    const { frame_export } = buildLegalModeFixture();
    expect(frame_export.schema_version).toBe(CURRENT_SCHEMA_VERSION);
  });
});
