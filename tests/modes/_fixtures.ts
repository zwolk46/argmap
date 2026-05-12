export { buildLegalModeFixture } from "../schema/fixtures/legal-mode-fixture";
export { mockRepository, type MockRepository } from "./fixtures/mock-repository";

import type {
  FrameVersion,
  ArgumentSession,
  Edge,
  RootQuestion,
  SubQuestion,
  Term,
  Interpretation,
  Checkpoint,
  Conclusion,
  AndGate,
} from "@/schema";

const T = "2026-05-01T12:00:00.000Z";

function makeBaseNode(id: string) {
  return { id, layer: "frame" as const, created_at: T, updated_at: T };
}

export function makeFv(overrides: Partial<FrameVersion> = {}): FrameVersion {
  return {
    id: "fv-test",
    frame_id: "fr-test",
    version_number: 1,
    created_at: T,
    is_milestone: false,
    nodes: [],
    edges: [],
    ...overrides,
  };
}

export function makeRoot(id = "root"): RootQuestion {
  return { ...makeBaseNode(id), type: "RootQuestion", statement: "Root?" };
}

export function makeSubQ(id: string, is_jurisdictional = false): SubQuestion {
  return { ...makeBaseNode(id), type: "SubQuestion", statement: `SubQ ${id}`, is_jurisdictional };
}

export function makeTerm(id: string, order = 0): Term {
  return { ...makeBaseNode(id), type: "Term", name: `term-${id}`, order, dispositive: false };
}

export function makeInterp(id: string): Interpretation {
  return { ...makeBaseNode(id), type: "Interpretation", statement: `Interp ${id}` };
}

export function makeCheckpoint(id: string): Checkpoint {
  return {
    ...makeBaseNode(id),
    type: "Checkpoint",
    question: `Q ${id}?`,
    answer_type: "boolean",
    options: [
      { id: `opt-yes-${id}`, label: "Yes", satisfies: true },
      { id: `opt-no-${id}`, label: "No", satisfies: false },
    ],
    requires_premise: false,
    requires_authority: false,
  };
}

export function makeConclusion(id: string): Conclusion {
  return {
    ...makeBaseNode(id),
    type: "Conclusion",
    statement: `Conclusion ${id}`,
    direction: { kind: "general", position_id: "pos-1" },
  };
}

export function makeAndGate(id: string, inputs: string[]): AndGate {
  return { ...makeBaseNode(id), type: "LogicalGate", gate_type: "AND", inputs };
}

export function makeEdge(id: string, type: Edge["type"], source: string, target: string): Edge {
  return {
    id,
    type,
    layer: "frame",
    source,
    target,
    created_at: T,
    updated_at: T,
  } as Edge;
}

export function makeSession(overrides: Partial<ArgumentSession> = {}): ArgumentSession {
  return {
    id: "s-test",
    frame_id: "fr-test",
    frame_version_id: "fv-test",
    frame_version_snapshot: makeFv(),
    title: "Test Session",
    premises: [],
    argument_edges: [],
    checkpoint_responses: [],
    interpretation_selections: [],
    status_map: {},
    created_at: T,
    updated_at: T,
    current_version_id: "sv-test",
    ...overrides,
  };
}
