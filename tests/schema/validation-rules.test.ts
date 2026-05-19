import { describe, it, expect } from "vitest";
import { runValidation, VALIDATION_RULES } from "@/schema";
import * as fixtures from "./fixtures/validation-fixtures";

type Mk = () => fixtures.Bundle;

interface RuleCase {
  rule_id: string;
  malformed: Mk;
  expected_count_min: number;
}

const CASES: RuleCase[] = [
  // V-FR
  { rule_id: "V-FR-1", malformed: fixtures.frameWithTwoRoots, expected_count_min: 1 },
  { rule_id: "V-FR-2", malformed: fixtures.frameWithOrphanSubQuestion, expected_count_min: 1 },
  { rule_id: "V-FR-3", malformed: fixtures.termWithOneInterpretationNoLink, expected_count_min: 1 },
  { rule_id: "V-FR-4", malformed: fixtures.checkpointUnreachable, expected_count_min: 1 },
  { rule_id: "V-FR-5", malformed: fixtures.conclusionUnreachable, expected_count_min: 1 },
  { rule_id: "V-FR-6", malformed: fixtures.frameWithCycle, expected_count_min: 1 },
  { rule_id: "V-FR-7", malformed: fixtures.legalFrameWithoutJurisdictional, expected_count_min: 1 },
  { rule_id: "V-FR-8", malformed: fixtures.danglingTerm, expected_count_min: 1 },
  { rule_id: "V-FR-9", malformed: fixtures.compoundCheckpoint, expected_count_min: 1 },
  { rule_id: "V-FR-10", malformed: fixtures.generalFrameMissingPosition, expected_count_min: 1 },
  {
    rule_id: "V-FR-11",
    malformed: fixtures.bindingAuthorityWithoutJurisdiction,
    expected_count_min: 1,
  },
  {
    rule_id: "V-FR-12",
    malformed: fixtures.interpretationWithoutCitesOrNotes,
    expected_count_min: 1,
  },

  // V-NODE
  { rule_id: "V-NODE-1", malformed: fixtures.edgeRefMissing, expected_count_min: 1 },
  { rule_id: "V-NODE-2", malformed: fixtures.nodeShapeMismatch, expected_count_min: 1 },
  { rule_id: "V-NODE-3", malformed: fixtures.termLinkCycle, expected_count_min: 1 },
  { rule_id: "V-NODE-4", malformed: fixtures.termLinkToNonTerm, expected_count_min: 1 },
  {
    rule_id: "V-NODE-5",
    malformed: fixtures.booleanCheckpointWrongOptionCount,
    expected_count_min: 1,
  },
  {
    rule_id: "V-NODE-6",
    malformed: fixtures.gradedCheckpointWrongOptionCount,
    expected_count_min: 1,
  },
  { rule_id: "V-NODE-7", malformed: fixtures.multipleChoiceTooFew, expected_count_min: 1 },
  { rule_id: "V-NODE-8", malformed: fixtures.satisfyingOptionMissingTarget, expected_count_min: 1 },
  { rule_id: "V-NODE-9", malformed: fixtures.duplicateOptionIds, expected_count_min: 1 },
  {
    rule_id: "V-NODE-11",
    malformed: fixtures.authorityLayerMismatchInFrame,
    expected_count_min: 1,
  },
  {
    rule_id: "V-NODE-11",
    malformed: fixtures.authorityLayerMismatchInSession,
    expected_count_min: 1,
  },

  // V-EDGE
  { rule_id: "V-EDGE-1", malformed: fixtures.badEdgeTypePair, expected_count_min: 1 },
  { rule_id: "V-EDGE-2", malformed: fixtures.duplicateEdge, expected_count_min: 1 },
  { rule_id: "V-EDGE-3", malformed: fixtures.argEdgeInFrameLayer, expected_count_min: 1 },
  { rule_id: "V-EDGE-4", malformed: fixtures.frameEdgeInArgLayer, expected_count_min: 1 },

  // V-GATE
  { rule_id: "V-GATE-1", malformed: fixtures.andGateTooFewInputs, expected_count_min: 1 },
  { rule_id: "V-GATE-2", malformed: fixtures.notGateMissingInput, expected_count_min: 1 },
  { rule_id: "V-GATE-3", malformed: fixtures.ifThenMissingSlot, expected_count_min: 1 },
  { rule_id: "V-GATE-4", malformed: fixtures.unlessMissingSlot, expected_count_min: 1 },
  { rule_id: "V-GATE-5", malformed: fixtures.gateInputIsTerm, expected_count_min: 1 },
  { rule_id: "V-GATE-6", malformed: fixtures.gateInputIsPremise, expected_count_min: 1 },

  // V-ARG
  { rule_id: "V-ARG-1", malformed: fixtures.responseMissingCheckpoint, expected_count_min: 1 },
  { rule_id: "V-ARG-2", malformed: fixtures.premiseMissingAuthority, expected_count_min: 1 },
  { rule_id: "V-ARG-3", malformed: fixtures.premiseWrongKindForMode, expected_count_min: 1 },
  { rule_id: "V-ARG-4", malformed: fixtures.authorityRefDoesNotResolve, expected_count_min: 1 },
  { rule_id: "V-ARG-5", malformed: fixtures.contestedCheckpoint, expected_count_min: 1 },
  { rule_id: "V-ARG-6", malformed: fixtures.selectionNotInterpretedAs, expected_count_min: 1 },
  { rule_id: "V-ARG-7", malformed: fixtures.termOnPathMissingSelection, expected_count_min: 1 },
  { rule_id: "V-ARG-8", malformed: fixtures.selectionOnLinkedTerm, expected_count_min: 1 },
];

const EXPECTED_IDS = [
  "V-FR-1",
  "V-FR-2",
  "V-FR-3",
  "V-FR-4",
  "V-FR-5",
  "V-FR-6",
  "V-FR-7",
  "V-FR-8",
  "V-FR-9",
  "V-FR-10",
  "V-FR-11",
  "V-FR-12",
  "V-NODE-1",
  "V-NODE-2",
  "V-NODE-3",
  "V-NODE-4",
  "V-NODE-5",
  "V-NODE-6",
  "V-NODE-7",
  "V-NODE-8",
  "V-NODE-9",
  "V-NODE-10",
  "V-NODE-11",
  "V-EDGE-1",
  "V-EDGE-2",
  "V-EDGE-3",
  "V-EDGE-4",
  "V-GATE-1",
  "V-GATE-2",
  "V-GATE-3",
  "V-GATE-4",
  "V-GATE-5",
  "V-GATE-6",
  "V-ARG-1",
  "V-ARG-2",
  "V-ARG-3",
  "V-ARG-4",
  "V-ARG-5",
  "V-ARG-6",
  "V-ARG-7",
  "V-ARG-8",
  "V-ARG-9",
];

describe("schema/validation-rules — registry shape", () => {
  it("the registry contains every documented rule id exactly once", () => {
    const ids = VALIDATION_RULES.map((r) => r.id);
    expect(new Set(ids)).toEqual(new Set(EXPECTED_IDS));
    expect(ids.length).toBe(EXPECTED_IDS.length);
  });

  it("runValidation walks rules in deterministic order", () => {
    const { frame } = fixtures.frameWithMultipleErrors();
    const a = runValidation(frame);
    const b = runValidation(frame);
    expect(a).toStrictEqual(b);
  });

  it("the clean reference fixture produces zero error-severity results", () => {
    const { frame, session } = fixtures.cleanReference();
    const results = runValidation(frame, session);
    const errors = results.filter((r) => r.severity === "error");
    expect(errors).toEqual([]);
  });
});

describe.each(CASES)("rule %s", ({ rule_id, malformed, expected_count_min }) => {
  it("fires on its targeted malformed fixture", () => {
    const { frame, session } = malformed();
    const results = runValidation(frame, session);
    const matches = results.filter((r) => r.rule_id === rule_id);
    expect(
      matches.length,
      `rule ${rule_id} did not fire; all results: ${JSON.stringify(results)}`,
    ).toBeGreaterThanOrEqual(expected_count_min);
  });

  it("does not fire on the clean reference fixture", () => {
    const { frame, session } = fixtures.cleanReference();
    const results = runValidation(frame, session);
    const matches = results.filter((r) => r.rule_id === rule_id);
    expect(matches).toEqual([]);
  });
});
