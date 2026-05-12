import { describe, it, expect } from "vitest";
import {
  attemptTransition,
  scanArchitecturalModeChange,
  scanFlavorChange,
  LEGAL_DIRECTION_VALUES,
} from "@/modes";
import { makeFv, makeRoot, makeSubQ, makeConclusion } from "./_fixtures";
import type { FrameVersion, ValidationResult, Conclusion } from "@/schema";
import type { ComputeResult } from "@/runtime";

const T = "2026-05-10T00:00:00.000Z";

function makeMinimalComputeResult(validation_results: ValidationResult[] = []): ComputeResult {
  return {
    validation_results,
    reachable_set: new Set(),
    active_set: new Set(),
    foreclosed_set: new Set(),
    status_map: new Map(),
    output: {
      shape: "incomplete",
      prose_summary: "",
      computed_at: T,
      confidence_breakdown: {
        total_checkpoints_on_path: 0,
        satisfied_via_binding: 0,
        satisfied_via_persuasive: 0,
        satisfied_via_stipulation: 0,
        satisfied_via_structural: 0,
        contested: 0,
        open: 0,
      },
    },
    active_path: [],
    open_gates: [],
  };
}

describe("modes/transitions", () => {
  describe("attemptTransition('frame_to_argument')", () => {
    it("returns ok:true when compute_result has no errors", () => {
      const fv = makeFv({ nodes: [makeRoot("root")] });
      const result = attemptTransition(
        "frame_to_argument",
        { frame: fv },
        {},
        { compute_result: makeMinimalComputeResult([]) },
      );
      expect(result.ok).toBe(true);
      expect(result.blocking).toHaveLength(0);
    });

    it("returns ok:false with blocking when compute_result has errors", () => {
      const fv = makeFv();
      const err: ValidationResult = {
        rule_id: "V-FR-1",
        severity: "error",
        message: "Missing root",
      };
      const result = attemptTransition(
        "frame_to_argument",
        { frame: fv },
        {},
        { compute_result: makeMinimalComputeResult([err]) },
      );
      expect(result.ok).toBe(false);
      expect(result.blocking).toHaveLength(1);
      expect(result.blocking[0]?.rule_id).toBe("V-FR-1");
    });

    it("classifies warning into advisory", () => {
      const fv = makeFv();
      const warn: ValidationResult = { rule_id: "W-1", severity: "warning", message: "Watch out" };
      const result = attemptTransition(
        "frame_to_argument",
        { frame: fv },
        {},
        { compute_result: makeMinimalComputeResult([warn]) },
      );
      expect(result.ok).toBe(true);
      expect(result.advisory).toHaveLength(1);
    });

    it("throws when neither compute_result nor validation is supplied", () => {
      const fv = makeFv();
      expect(() => attemptTransition("frame_to_argument", { frame: fv }, {}, undefined)).toThrow();
    });

    it("accepts precomputed.validation as fallback", () => {
      const fv = makeFv();
      const err: ValidationResult = { rule_id: "V-1", severity: "error", message: "err" };
      const result = attemptTransition(
        "frame_to_argument",
        { frame: fv },
        {},
        { validation: [err] },
      );
      expect(result.ok).toBe(false);
      expect(result.blocking[0]?.rule_id).toBe("V-1");
    });
  });

  describe("attemptTransition('argument_to_frame')", () => {
    it("always returns ok:true", () => {
      const fv = makeFv({ id: "fv-1" });
      const result = attemptTransition("argument_to_frame", { frame: fv }, {});
      expect(result.ok).toBe(true);
    });

    it("emits drift advisory when session.frame_version_id !== frame.id", () => {
      const fv = makeFv({ id: "fv-new" });
      const session = {
        id: "s-1",
        frame_id: "fr-1",
        frame_version_id: "fv-old",
        frame_version_snapshot: fv,
        title: "S",
        premises: [],
        argument_edges: [],
        checkpoint_responses: [],
        interpretation_selections: [],
        status_map: {},
        created_at: T,
        updated_at: T,
        current_version_id: "sv-1",
      };
      const result = attemptTransition("argument_to_frame", { frame: fv, session }, {});
      expect(result.advisory.some((v) => v.rule_id === "MODE-DRIFT-ADVISORY")).toBe(true);
    });

    it("emits no advisory when versions match", () => {
      const fv = makeFv({ id: "fv-1" });
      const session = {
        id: "s-1",
        frame_id: "fr-1",
        frame_version_id: "fv-1",
        frame_version_snapshot: fv,
        title: "S",
        premises: [],
        argument_edges: [],
        checkpoint_responses: [],
        interpretation_selections: [],
        status_map: {},
        created_at: T,
        updated_at: T,
        current_version_id: "sv-1",
      };
      const result = attemptTransition("argument_to_frame", { frame: fv, session }, {});
      expect(result.advisory).toHaveLength(0);
    });
  });

  describe("scanArchitecturalModeChange / attemptTransition('architectural')", () => {
    it("blocks general→legal when a Conclusion has direction.kind === 'general'", () => {
      const conc = makeConclusion("conc");
      const fv = makeFv({ nodes: [makeRoot("root"), conc] });
      // conc has direction.kind === 'general'; going general→legal requires "legal"
      const result = scanArchitecturalModeChange(fv, "general", "legal");
      expect(result.ok).toBe(false);
      expect(result.blocking.some((v) => v.rule_id === "MODE-CHANGE-CONCLUSION-DIRECTION")).toBe(
        true,
      );
    });

    it("returns inline_editors when direction mismatch exists", () => {
      const conc: Conclusion = {
        id: "c1",
        type: "Conclusion",
        layer: "frame",
        statement: "C",
        direction: { kind: "general", position_id: "p1" },
        created_at: T,
        updated_at: T,
      };
      const fv = makeFv({ nodes: [makeRoot("root"), conc] });
      const result = scanArchitecturalModeChange(fv, "general", "legal");
      expect(result.inline_editors).toBeDefined();
      expect(result.inline_editors?.[0]?.node_id).toBe("c1");
      expect(result.inline_editors?.[0]?.options.some((o) => o.value === "affirm")).toBe(true);
    });

    it("emits advisories for requires_authority on legal→general", () => {
      const cp: import("@/schema").Checkpoint = {
        id: "cp",
        type: "Checkpoint",
        layer: "frame",
        question: "Q?",
        answer_type: "boolean",
        options: [],
        requires_premise: false,
        requires_authority: true,
        created_at: T,
        updated_at: T,
      };
      const fv = makeFv({ nodes: [makeRoot("root"), cp] });
      const result = scanArchitecturalModeChange(fv, "legal", "general");
      expect(
        result.advisory.some((v) => v.rule_id === "MODE-CHANGE-REQUIRES-AUTHORITY-INERT"),
      ).toBe(true);
    });

    it("walks nodes sorted by id for determinism", () => {
      const subq = makeSubQ("subq");
      subq.is_jurisdictional = true;
      const fv = makeFv({ nodes: [makeRoot("root"), subq] });
      const r1 = scanArchitecturalModeChange(fv, "legal", "general");
      const shuffled = makeFv({ nodes: [subq, makeRoot("root")] });
      const r2 = scanArchitecturalModeChange(shuffled, "legal", "general");
      expect(r1.advisory.map((v) => v.rule_id)).toEqual(r2.advisory.map((v) => v.rule_id));
    });
  });

  describe("scanFlavorChange / attemptTransition('flavor')", () => {
    it("always returns ok:true", () => {
      const fv = makeFv();
      expect(scanFlavorChange(fv, "personal", "academic").ok).toBe(true);
    });

    it("emits FLAVOR-CHANGE-AUTHORITY-HIDDEN when target is personal", () => {
      const auth: import("@/schema").Authority = {
        id: "auth-1",
        type: "Authority",
        layer: "frame",
        citation: "Test v. Test",
        created_at: T,
        updated_at: T,
      };
      const fv = makeFv({ nodes: [makeRoot("root"), auth] });
      const result = scanFlavorChange(fv, "academic", "personal");
      expect(result.advisory.some((v) => v.rule_id === "FLAVOR-CHANGE-AUTHORITY-HIDDEN")).toBe(
        true,
      );
    });

    it("emits FLAVOR-CHANGE-AUTHORITY-RELABELED when target is academic", () => {
      const auth: import("@/schema").Authority = {
        id: "auth-1",
        type: "Authority",
        layer: "frame",
        citation: "Test v. Test",
        created_at: T,
        updated_at: T,
      };
      const fv = makeFv({ nodes: [makeRoot("root"), auth] });
      const result = scanFlavorChange(fv, "personal", "academic");
      expect(result.advisory.some((v) => v.rule_id === "FLAVOR-CHANGE-AUTHORITY-RELABELED")).toBe(
        true,
      );
    });

    it("emits no advisory when current_flavor === target_flavor", () => {
      const fv = makeFv();
      const result = scanFlavorChange(fv, "academic", "academic");
      expect(result.advisory).toHaveLength(0);
    });
  });

  describe("LEGAL_DIRECTION_VALUES constant", () => {
    it("matches @/schema ConclusionDirection legal values", async () => {
      // Pin that our constant matches the schema. Import @/schema types to verify.
      const schema_values = [
        "affirm",
        "custom",
        "dismiss",
        "favors_defendant",
        "favors_plaintiff",
        "remand",
        "reverse",
      ] as const;
      const constant_set = new Set<string>([...LEGAL_DIRECTION_VALUES]);
      for (const v of schema_values) {
        expect(constant_set.has(v)).toBe(true);
      }
      expect(LEGAL_DIRECTION_VALUES.length).toBe(schema_values.length);
    });
  });

  describe("determinism", () => {
    it("produces byte-identical TransitionResult for two invocations with identical inputs", () => {
      const fv: FrameVersion = makeFv({ nodes: [makeRoot("root")] });
      const err: ValidationResult = { rule_id: "V-1", severity: "error", message: "err" };
      const cr = makeMinimalComputeResult([err]);
      const r1 = attemptTransition("frame_to_argument", { frame: fv }, {}, { compute_result: cr });
      const r2 = attemptTransition("frame_to_argument", { frame: fv }, {}, { compute_result: cr });
      expect(r1).toEqual(r2);
    });
  });
});
