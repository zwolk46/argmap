import { describe, it, expect } from "vitest";
import {
  buildBreadcrumb,
  statementPreviewFor,
} from "@/ui/argument-running/interview-pane/interview-row";
import type { FrameVersion, Node } from "@/schema";

const ts = "2026-05-12T00:00:00.000Z";

function fv(nodes: Node[], edges: FrameVersion["edges"]): FrameVersion {
  return {
    id: "fv-1",
    frame_id: "f-1",
    version_number: 1,
    created_at: ts,
    nodes,
    edges,
    is_milestone: false,
  };
}

describe("statementPreviewFor", () => {
  it("returns Checkpoint.question", () => {
    const n: Node = {
      id: "c1",
      type: "Checkpoint",
      layer: "frame",
      question: "Q?",
      answer_type: "boolean",
      options: [],
      requires_premise: false,
      requires_authority: false,
      created_at: ts,
      updated_at: ts,
    };
    expect(statementPreviewFor(n)).toBe("Q?");
  });
  it("returns Term.name", () => {
    const n: Node = {
      id: "t1",
      type: "Term",
      layer: "frame",
      name: "Reasonableness",
      order: 0,
      dispositive: false,
      created_at: ts,
      updated_at: ts,
    };
    expect(statementPreviewFor(n)).toBe("Reasonableness");
  });
  it("returns Interpretation.statement", () => {
    const n: Node = {
      id: "i1",
      type: "Interpretation",
      layer: "frame",
      statement: "A reasonable person…",
      created_at: ts,
      updated_at: ts,
    };
    expect(statementPreviewFor(n)).toBe("A reasonable person…");
  });
});

describe("buildBreadcrumb", () => {
  it("walks structural parent edges", () => {
    const root: Node = {
      id: "rq",
      type: "RootQuestion",
      layer: "frame",
      statement: "Liability?",
      created_at: ts,
      updated_at: ts,
    };
    const sq: Node = {
      id: "sq",
      type: "SubQuestion",
      layer: "frame",
      statement: "Duty?",
      is_jurisdictional: false,
      created_at: ts,
      updated_at: ts,
    };
    const term: Node = {
      id: "t",
      type: "Term",
      layer: "frame",
      name: "Reasonableness",
      order: 0,
      dispositive: false,
      created_at: ts,
      updated_at: ts,
    };
    const version = fv(
      [root, sq, term],
      [
        {
          id: "e1",
          type: "DECOMPOSES_INTO",
          layer: "frame",
          source: "rq",
          target: "sq",
          created_at: ts,
          updated_at: ts,
        },
        {
          id: "e2",
          type: "TURNS_ON",
          layer: "frame",
          source: "sq",
          target: "t",
          created_at: ts,
          updated_at: ts,
        },
      ],
    );
    expect(buildBreadcrumb(version, "t")).toBe("Liability? → Duty?");
  });

  it("returns empty string for a root node", () => {
    const root: Node = {
      id: "rq",
      type: "RootQuestion",
      layer: "frame",
      statement: "Q?",
      created_at: ts,
      updated_at: ts,
    };
    expect(buildBreadcrumb(fv([root], []), "rq")).toBe("");
  });
});
