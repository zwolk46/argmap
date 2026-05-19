import type { NodeRef, EdgeRef } from "./identifiers";
import type { FrameVersion } from "./frame";
import type { ArgumentSession, NodeStatus } from "./session";
import type {
  Node,
  NodeType,
  Term,
  Authority,
  Checkpoint,
  Conclusion,
  Interpretation,
} from "./nodes";
import type { Edge, EdgeType } from "./edges";
import { VALID_EDGE_PAIRS } from "./edges";
import { PREMISE_KIND_VOCABULARIES, toModeFlavor, type PremiseKindVocabularyKey } from "./frame";

// ============================================================================
// Public shapes
// ============================================================================

export type Severity = "error" | "warning";

export interface ValidationResult {
  rule_id: string;
  severity: Severity;
  node_id?: NodeRef;
  edge_id?: EdgeRef;
  message: string;
}

export interface ValidationRule {
  id: string;
  severity: Severity;
  description: string;
  evaluate(frame: FrameVersion, session?: ArgumentSession): ValidationResult[];
}

// Aggregator. Sort rules by id lexicographically for determinism (Article II § 2).
export function runValidation(
  frame: FrameVersion,
  session?: ArgumentSession,
  rules: ReadonlyArray<ValidationRule> = VALIDATION_RULES,
): ValidationResult[] {
  const sorted = [...rules].sort((a, b) => a.id.localeCompare(b.id));
  const out: ValidationResult[] = [];
  for (const r of sorted) out.push(...r.evaluate(frame, session));
  return out;
}

// ============================================================================
// Internal helpers
// ============================================================================

function indexNodes(frame: FrameVersion): Map<string, Node> {
  const m = new Map<string, Node>();
  for (const n of frame.nodes) m.set(n.id, n);
  return m;
}

function isFrameStructuralEdge(t: EdgeType): boolean {
  return (
    t === "DECOMPOSES_INTO" ||
    t === "TURNS_ON" ||
    t === "INTERPRETED_AS" ||
    t === "LEADS_TO" ||
    t === "GATES"
  );
}

function vocabularyFor(
  mode: "legal" | "general",
  flavor?: "personal" | "academic",
): PremiseKindVocabularyKey {
  if (mode === "legal") return "legal";
  return flavor === "personal" ? "general_personal" : "general_academic";
}

// Lex-sort node ids; never iterate Map/Set without going through this.
function sortedIds(ids: Iterable<string>): string[] {
  return Array.from(ids).sort((a, b) => a.localeCompare(b));
}

// ============================================================================
// V-FR-1..12  Frame-level
// ============================================================================

const V_FR_1: ValidationRule = {
  id: "V-FR-1",
  severity: "error",
  description: "The frame has exactly one RootQuestion.",
  evaluate(frame) {
    const roots = frame.nodes.filter((n) => n.type === "RootQuestion");
    if (roots.length === 1) return [];
    if (roots.length === 0) {
      return [{ rule_id: "V-FR-1", severity: "error", message: "Frame has no RootQuestion." }];
    }
    return roots
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((n) => ({
        rule_id: "V-FR-1",
        severity: "error" as const,
        node_id: n.id,
        message: `Frame has ${roots.length} RootQuestions; expected exactly one.`,
      }));
  },
};

const V_FR_2: ValidationRule = {
  id: "V-FR-2",
  severity: "error",
  description:
    "Every non-Root node has at least one incoming edge. Authority and Premise are exempt.",
  evaluate(frame) {
    const incoming = new Set<string>();
    for (const e of frame.edges) incoming.add(e.target);
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type === "RootQuestion") continue;
      if (n.type === "Authority" || n.type === "Premise") continue;
      if (!incoming.has(n.id)) {
        out.push({
          rule_id: "V-FR-2",
          severity: "error",
          node_id: n.id,
          message: `Orphan node ${n.id} (${n.type}) has no incoming edge.`,
        });
      }
    }
    return out;
  },
};

const V_FR_3: ValidationRule = {
  id: "V-FR-3",
  severity: "error",
  description:
    "Every Term has at least two outgoing INTERPRETED_AS edges, OR a non-null linked_to.",
  evaluate(frame) {
    const out: ValidationResult[] = [];
    const terms = frame.nodes.filter((n): n is Term => n.type === "Term");
    for (const t of terms.sort((a, b) => a.id.localeCompare(b.id))) {
      if (t.linked_to) continue;
      const interpretations = frame.edges.filter(
        (e) => e.type === "INTERPRETED_AS" && e.source === t.id,
      ).length;
      if (interpretations < 2) {
        out.push({
          rule_id: "V-FR-3",
          severity: "error",
          node_id: t.id,
          message: `Term ${t.id} has ${interpretations} Interpretation(s) and no linked_to; need at least 2 or a link.`,
        });
      }
    }
    return out;
  },
};

const V_FR_4: ValidationRule = {
  id: "V-FR-4",
  severity: "error",
  description: "Every Checkpoint is reachable from RootQuestion through frame-layer edges.",
  evaluate(frame) {
    const root = frame.nodes.find((n) => n.type === "RootQuestion");
    if (!root) return [];
    const adj = new Map<string, string[]>();
    for (const e of [...frame.edges].sort((a, b) => a.id.localeCompare(b.id))) {
      if (!isFrameStructuralEdge(e.type)) continue;
      const list = adj.get(e.source) ?? [];
      list.push(e.target);
      adj.set(e.source, list);
    }
    const visited = new Set<string>([root.id]);
    const stack = [root.id];
    while (stack.length) {
      const cur = stack.pop()!;
      const next = adj.get(cur) ?? [];
      for (const n of [...next].sort((a, b) => a.localeCompare(b))) {
        if (!visited.has(n)) {
          visited.add(n);
          stack.push(n);
        }
      }
    }
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "Checkpoint") continue;
      if (!visited.has(n.id)) {
        out.push({
          rule_id: "V-FR-4",
          severity: "error",
          node_id: n.id,
          message: `Checkpoint ${n.id} is unreachable from RootQuestion.`,
        });
      }
    }
    return out;
  },
};

const V_FR_5: ValidationRule = {
  id: "V-FR-5",
  severity: "error",
  description: "Every Conclusion is reachable from RootQuestion.",
  evaluate(frame) {
    const root = frame.nodes.find((n) => n.type === "RootQuestion");
    if (!root) return [];
    const adj = new Map<string, string[]>();
    for (const e of [...frame.edges].sort((a, b) => a.id.localeCompare(b.id))) {
      if (!isFrameStructuralEdge(e.type)) continue;
      const list = adj.get(e.source) ?? [];
      list.push(e.target);
      adj.set(e.source, list);
    }
    const visited = new Set<string>([root.id]);
    const stack = [root.id];
    while (stack.length) {
      const cur = stack.pop()!;
      const next = adj.get(cur) ?? [];
      for (const n of [...next].sort((a, b) => a.localeCompare(b))) {
        if (!visited.has(n)) {
          visited.add(n);
          stack.push(n);
        }
      }
    }
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "Conclusion") continue;
      if (!visited.has(n.id)) {
        out.push({
          rule_id: "V-FR-5",
          severity: "error",
          node_id: n.id,
          message: `Conclusion ${n.id} is unreachable from RootQuestion.`,
        });
      }
    }
    return out;
  },
};

const V_FR_6: ValidationRule = {
  id: "V-FR-6",
  severity: "error",
  description:
    "The frame graph (excluding FORECLOSES, BINDING_IN, CITES, DISTINGUISHED_BY) is a DAG.",
  evaluate(frame) {
    const adj = new Map<string, string[]>();
    for (const e of frame.edges) {
      if (
        e.type === "FORECLOSES" ||
        e.type === "BINDING_IN" ||
        e.type === "CITES" ||
        e.type === "DISTINGUISHED_BY"
      ) {
        continue;
      }
      const list = adj.get(e.source) ?? [];
      list.push(e.target);
      adj.set(e.source, list);
    }
    const color = new Map<string, "white" | "grey" | "black">();
    for (const id of sortedIds(frame.nodes.map((n) => n.id))) color.set(id, "white");
    const cycleNodes: string[] = [];

    function dfs(u: string): void {
      color.set(u, "grey");
      const out = adj.get(u) ?? [];
      for (const v of [...out].sort((a, b) => a.localeCompare(b))) {
        const c = color.get(v);
        if (c === "grey") {
          cycleNodes.push(v);
        } else if (c === "white") {
          dfs(v);
        }
      }
      color.set(u, "black");
    }

    for (const id of sortedIds(color.keys())) {
      if (color.get(id) === "white") dfs(id);
    }

    if (cycleNodes.length === 0) return [];
    const unique = Array.from(new Set(cycleNodes)).sort((a, b) => a.localeCompare(b));
    return unique.map((id) => ({
      rule_id: "V-FR-6",
      severity: "error" as const,
      node_id: id,
      message: `Cycle detected involving node ${id}.`,
    }));
  },
};

const V_FR_7: ValidationRule = {
  id: "V-FR-7",
  severity: "warning",
  description: "Legal-mode frame has at least one SubQuestion with is_jurisdictional: true.",
  evaluate(frame) {
    // F-028: FrameVersion now snapshots `mode` directly. Prefer that signal
    // — otherwise we'd false-trigger mid-construction (legal-mode frame with
    // no Conclusions yet looks "general" by the old inference and the rule
    // silently doesn't apply, hiding the missing-jurisdictional warning).
    const isLegal =
      frame.mode === "legal" ||
      (frame.mode === undefined &&
        frame.nodes.some(
          (n) => n.type === "Conclusion" && (n as Conclusion).direction.kind === "legal",
        ));
    if (!isLegal) return [];
    const hasJurisdictional = frame.nodes.some(
      (n) =>
        n.type === "SubQuestion" &&
        (n as { is_jurisdictional?: boolean }).is_jurisdictional === true,
    );
    if (hasJurisdictional) return [];
    return [
      {
        rule_id: "V-FR-7",
        severity: "warning",
        message: "Legal-mode frame has no jurisdictional SubQuestion.",
      },
    ];
  },
};

const V_FR_8: ValidationRule = {
  id: "V-FR-8",
  severity: "error",
  description:
    "Every path from RootQuestion eventually terminates at a Conclusion (no dangling Term/Checkpoint).",
  evaluate(frame) {
    const root = frame.nodes.find((n) => n.type === "RootQuestion");
    if (!root) return [];
    const idx = indexNodes(frame);

    // Outgoing structural edges + Checkpoint option-target virtual edges
    const adj = new Map<string, string[]>();
    for (const e of frame.edges) {
      if (!isFrameStructuralEdge(e.type)) continue;
      const list = adj.get(e.source) ?? [];
      list.push(e.target);
      adj.set(e.source, list);
    }
    for (const n of frame.nodes) {
      if (n.type !== "Checkpoint") continue;
      const c = n as Checkpoint;
      const list = adj.get(n.id) ?? [];
      for (const opt of c.options) {
        if (opt.target_node_id) list.push(opt.target_node_id);
      }
      if (list.length) adj.set(n.id, list);
    }

    // memo: can this node reach a Conclusion?
    const memo = new Map<string, boolean>();
    function canReachConclusion(u: string, visiting: Set<string>): boolean {
      if (memo.has(u)) return memo.get(u)!;
      const node = idx.get(u);
      if (!node) return false;
      if (node.type === "Conclusion") {
        memo.set(u, true);
        return true;
      }
      if (visiting.has(u)) {
        // cycle without conclusion is a separate V-FR-6 concern; treat as no
        return false;
      }
      visiting.add(u);
      const out = adj.get(u) ?? [];
      let any = false;
      for (const v of [...out].sort((a, b) => a.localeCompare(b))) {
        if (canReachConclusion(v, visiting)) {
          any = true;
          break;
        }
      }
      visiting.delete(u);
      memo.set(u, any);
      return any;
    }

    const results: ValidationResult[] = [];
    // Walk reachable nodes from root; check terminals (Term, Checkpoint) for
    // continuation. SubQuestion / Interpretation / LogicalGate are intermediate;
    // their dangling-ness is captured via their downstream check.
    const visited = new Set<string>();
    const stack = [root.id];
    while (stack.length) {
      const cur = stack.pop()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      const outs = adj.get(cur) ?? [];
      for (const v of [...outs].sort((a, b) => a.localeCompare(b))) stack.push(v);
    }

    for (const id of sortedIds(visited)) {
      const node = idx.get(id);
      if (!node) continue;
      if (node.type === "Checkpoint" || node.type === "Term") {
        if (!canReachConclusion(id, new Set())) {
          results.push({
            rule_id: "V-FR-8",
            severity: "error",
            node_id: id,
            message: `${node.type} ${id} does not reach a Conclusion.`,
          });
        }
      }
    }
    return results;
  },
};

const V_FR_9: ValidationRule = {
  id: "V-FR-9",
  severity: "warning",
  description:
    "No compound Checkpoints. Heuristic warning when question contains ' and '/' or ' between clauses.",
  evaluate(frame) {
    const out: ValidationResult[] = [];
    const STOP_WORDS = new Set(["a", "an", "the", "of", "to", "in", "on", "as"]);
    function clauseLike(s: string): boolean {
      const tokens = s
        .trim()
        .split(/\s+/)
        .filter((t) => !STOP_WORDS.has(t.toLowerCase()));
      return tokens.length >= 2;
    }
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "Checkpoint") continue;
      const q = (n as Checkpoint).question;
      for (const sep of [" and ", " or "]) {
        const idx = q.toLowerCase().indexOf(sep);
        if (idx < 0) continue;
        const left = q.slice(0, idx);
        const right = q.slice(idx + sep.length);
        if (clauseLike(left) && clauseLike(right)) {
          out.push({
            rule_id: "V-FR-9",
            severity: "warning",
            node_id: n.id,
            message: `Checkpoint ${n.id} may be compound: contains "${sep.trim()}" between clauses.`,
          });
          break;
        }
      }
    }
    return out;
  },
};

const V_FR_10: ValidationRule = {
  id: "V-FR-10",
  severity: "error",
  description: "(general mode) Every Conclusion's direction.position_id resolves to a Position.",
  evaluate(frame) {
    // FrameVersion doesn't carry positions; positions live on Frame. We can only
    // check the local invariant: every Conclusion with kind "general" must have a
    // non-empty position_id (positional consistency to Frame.positions is checked
    // when the Frame is loaded alongside the FrameVersion at the Repository layer).
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "Conclusion") continue;
      const c = n as Conclusion;
      if (c.direction.kind === "general") {
        if (!c.direction.position_id || c.direction.position_id.trim() === "") {
          out.push({
            rule_id: "V-FR-10",
            severity: "error",
            node_id: n.id,
            message: `Conclusion ${n.id} has no position_id (general mode).`,
          });
        }
      }
    }
    return out;
  },
};

const V_FR_11: ValidationRule = {
  id: "V-FR-11",
  severity: "error",
  description: "(legal mode) Every Authority with is_binding: true has a non-null jurisdiction.",
  evaluate(frame) {
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "Authority") continue;
      const a = n as Authority;
      if (a.is_binding === true && !a.jurisdiction) {
        out.push({
          rule_id: "V-FR-11",
          severity: "error",
          node_id: n.id,
          message: `Authority ${n.id} is binding but has no jurisdiction.`,
        });
      }
    }
    return out;
  },
};

const V_FR_12: ValidationRule = {
  id: "V-FR-12",
  severity: "warning",
  description: "Every Interpretation with no incoming CITES has at least one notes field.",
  evaluate(frame) {
    const citedTargets = new Set<string>();
    for (const e of frame.edges) {
      if (e.type === "CITES") citedTargets.add(e.target);
    }
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "Interpretation") continue;
      const i = n as Interpretation;
      if (!citedTargets.has(n.id) && (!i.notes || i.notes.trim() === "")) {
        out.push({
          rule_id: "V-FR-12",
          severity: "warning",
          node_id: n.id,
          message: `Interpretation ${n.id} has no citing Authority and no notes.`,
        });
      }
    }
    return out;
  },
};

// ============================================================================
// V-NODE-1..9
// ============================================================================

const V_NODE_1: ValidationRule = {
  id: "V-NODE-1",
  severity: "error",
  description:
    "Every NodeRef resolves to a node within the same FrameVersion (frame-layer) or ArgumentSession (argument-layer). Cross-layer refs allowed only argument → frame.",
  evaluate(frame, session) {
    const frameIds = new Set(frame.nodes.map((n) => n.id));
    const sessionIds = session
      ? new Set([
          ...session.premises.map((p) => p.id),
          ...(session.session_authorities ?? []).map((a) => a.id),
        ])
      : new Set<string>();
    const allArgValid = new Set([...frameIds, ...sessionIds]);

    const out: ValidationResult[] = [];

    // Edges
    for (const e of [...frame.edges].sort((a, b) => a.id.localeCompare(b.id))) {
      if (e.type === "BINDING_IN") continue;
      if (!frameIds.has(e.source)) {
        out.push({
          rule_id: "V-NODE-1",
          severity: "error",
          edge_id: e.id,
          message: `Edge ${e.id} source ${e.source} does not resolve in FrameVersion.`,
        });
      }
      if (!frameIds.has(e.target)) {
        out.push({
          rule_id: "V-NODE-1",
          severity: "error",
          edge_id: e.id,
          message: `Edge ${e.id} target ${e.target} does not resolve in FrameVersion.`,
        });
      }
    }

    if (session) {
      for (const e of [...session.argument_edges].sort((a, b) => a.id.localeCompare(b.id))) {
        if (!allArgValid.has(e.source)) {
          out.push({
            rule_id: "V-NODE-1",
            severity: "error",
            edge_id: e.id,
            message: `Argument edge ${e.id} source ${e.source} does not resolve.`,
          });
        }
        if (!allArgValid.has(e.target)) {
          out.push({
            rule_id: "V-NODE-1",
            severity: "error",
            edge_id: e.id,
            message: `Argument edge ${e.id} target ${e.target} does not resolve.`,
          });
        }
      }

      // Premise.authority_ref
      for (const p of [...session.premises].sort((a, b) => a.id.localeCompare(b.id))) {
        if (p.authority_ref && !allArgValid.has(p.authority_ref)) {
          out.push({
            rule_id: "V-NODE-1",
            severity: "error",
            node_id: p.id,
            message: `Premise ${p.id} authority_ref ${p.authority_ref} does not resolve.`,
          });
        }
      }
    }

    return out;
  },
};

const V_NODE_2: ValidationRule = {
  id: "V-NODE-2",
  severity: "error",
  description: "Every node's type matches the structural shape of its fields.",
  evaluate(frame) {
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      switch (n.type) {
        case "RootQuestion":
        case "SubQuestion":
          if (typeof (n as { statement?: unknown }).statement !== "string") {
            out.push({
              rule_id: "V-NODE-2",
              severity: "error",
              node_id: n.id,
              message: `${n.type} ${n.id} missing statement.`,
            });
          }
          break;
        case "Term":
          if (typeof (n as Term).order !== "number") {
            out.push({
              rule_id: "V-NODE-2",
              severity: "error",
              node_id: n.id,
              message: `Term ${n.id} missing order.`,
            });
          }
          break;
        case "Interpretation":
          if (typeof (n as Interpretation).statement !== "string") {
            out.push({
              rule_id: "V-NODE-2",
              severity: "error",
              node_id: n.id,
              message: `Interpretation ${n.id} missing statement.`,
            });
          }
          break;
        case "Checkpoint":
          if (typeof (n as Checkpoint).question !== "string") {
            out.push({
              rule_id: "V-NODE-2",
              severity: "error",
              node_id: n.id,
              message: `Checkpoint ${n.id} missing question.`,
            });
          }
          break;
        case "LogicalGate": {
          const g = n as { gate_type?: string };
          if (typeof g.gate_type !== "string") {
            out.push({
              rule_id: "V-NODE-2",
              severity: "error",
              node_id: n.id,
              message: `LogicalGate ${n.id} missing gate_type.`,
            });
          }
          break;
        }
        case "Conclusion":
          if (!(n as Conclusion).direction) {
            out.push({
              rule_id: "V-NODE-2",
              severity: "error",
              node_id: n.id,
              message: `Conclusion ${n.id} missing direction.`,
            });
          }
          break;
        case "Authority":
          if (typeof (n as Authority).citation !== "string") {
            out.push({
              rule_id: "V-NODE-2",
              severity: "error",
              node_id: n.id,
              message: `Authority ${n.id} missing citation.`,
            });
          }
          break;
        case "Premise":
          if (typeof (n as { statement?: unknown }).statement !== "string") {
            out.push({
              rule_id: "V-NODE-2",
              severity: "error",
              node_id: n.id,
              message: `Premise ${n.id} missing statement.`,
            });
          }
          break;
      }
    }
    return out;
  },
};

const V_NODE_3: ValidationRule = {
  id: "V-NODE-3",
  severity: "error",
  description: "Term linked_to chains terminate (no cycles).",
  evaluate(frame) {
    const out: ValidationResult[] = [];
    const byId = new Map<string, Term>();
    for (const n of frame.nodes) if (n.type === "Term") byId.set(n.id, n as Term);
    const startIds = sortedIds(byId.keys());
    for (const start of startIds) {
      const seen = new Set<string>();
      let cur: Term | undefined = byId.get(start);
      while (cur && cur.linked_to) {
        if (seen.has(cur.id)) {
          out.push({
            rule_id: "V-NODE-3",
            severity: "error",
            node_id: start,
            message: `Term linked_to chain starting at ${start} contains a cycle.`,
          });
          break;
        }
        seen.add(cur.id);
        cur = byId.get(cur.linked_to);
      }
    }
    return out;
  },
};

const V_NODE_4: ValidationRule = {
  id: "V-NODE-4",
  severity: "error",
  description: "Term linked_to targets a Term within the same FrameVersion.",
  evaluate(frame) {
    const out: ValidationResult[] = [];
    const idx = indexNodes(frame);
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "Term") continue;
      const t = n as Term;
      if (!t.linked_to) continue;
      const target = idx.get(t.linked_to);
      if (!target || target.type !== "Term") {
        out.push({
          rule_id: "V-NODE-4",
          severity: "error",
          node_id: t.id,
          message: `Term ${t.id} linked_to ${t.linked_to} which is not a Term in this FrameVersion.`,
        });
      }
    }
    return out;
  },
};

const V_NODE_5: ValidationRule = {
  id: "V-NODE-5",
  severity: "error",
  description: "Checkpoint answer_type 'boolean' has exactly two options.",
  evaluate(frame) {
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "Checkpoint") continue;
      const c = n as Checkpoint;
      if (c.answer_type === "boolean" && c.options.length !== 2) {
        out.push({
          rule_id: "V-NODE-5",
          severity: "error",
          node_id: n.id,
          message: `Boolean Checkpoint ${n.id} has ${c.options.length} options; expected 2.`,
        });
      }
    }
    return out;
  },
};

const V_NODE_6: ValidationRule = {
  id: "V-NODE-6",
  severity: "error",
  description: "Checkpoint answer_type 'graded' has exactly three options.",
  evaluate(frame) {
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "Checkpoint") continue;
      const c = n as Checkpoint;
      if (c.answer_type === "graded" && c.options.length !== 3) {
        out.push({
          rule_id: "V-NODE-6",
          severity: "error",
          node_id: n.id,
          message: `Graded Checkpoint ${n.id} has ${c.options.length} options; expected 3.`,
        });
      }
    }
    return out;
  },
};

const V_NODE_7: ValidationRule = {
  id: "V-NODE-7",
  severity: "error",
  description: "Checkpoint answer_type 'multiple_choice' has at least two options.",
  evaluate(frame) {
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "Checkpoint") continue;
      const c = n as Checkpoint;
      if (c.answer_type === "multiple_choice" && c.options.length < 2) {
        out.push({
          rule_id: "V-NODE-7",
          severity: "error",
          node_id: n.id,
          message: `Multiple-choice Checkpoint ${n.id} has ${c.options.length} options; need ≥2.`,
        });
      }
    }
    return out;
  },
};

const V_NODE_8: ValidationRule = {
  id: "V-NODE-8",
  severity: "error",
  description: "Every CheckpointOption with satisfies: true has a non-null target_node_id.",
  evaluate(frame) {
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "Checkpoint") continue;
      const c = n as Checkpoint;
      for (const opt of [...c.options].sort((a, b) => a.id.localeCompare(b.id))) {
        if (!opt.satisfies) continue;
        if (!opt.target_node_id) {
          out.push({
            rule_id: "V-NODE-8",
            severity: "error",
            node_id: n.id,
            message: `CheckpointOption ${opt.id} on ${n.id} satisfies but has no target_node_id.`,
          });
        }
      }
    }
    return out;
  },
};

const V_NODE_9: ValidationRule = {
  id: "V-NODE-9",
  severity: "error",
  description: "Every CheckpointOption.id is unique within its parent Checkpoint.",
  evaluate(frame) {
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "Checkpoint") continue;
      const c = n as Checkpoint;
      const seen = new Map<string, number>();
      for (const opt of c.options) {
        seen.set(opt.id, (seen.get(opt.id) ?? 0) + 1);
      }
      for (const id of sortedIds(seen.keys())) {
        if ((seen.get(id) ?? 0) > 1) {
          out.push({
            rule_id: "V-NODE-9",
            severity: "error",
            node_id: n.id,
            message: `Checkpoint ${n.id} has duplicate option id "${id}".`,
          });
        }
      }
    }
    return out;
  },
};

// ============================================================================
// V-EDGE-1..4
// ============================================================================

const V_EDGE_1: ValidationRule = {
  id: "V-EDGE-1",
  severity: "error",
  description: "Every edge's source and target types are permitted by VALID_EDGE_PAIRS.",
  evaluate(frame, session) {
    const idx = indexNodes(frame);
    const out: ValidationResult[] = [];
    const checkEdge = (e: Edge, inSession: boolean): void => {
      if (e.type === "BINDING_IN") return;
      const allowed = VALID_EDGE_PAIRS[e.type];
      const src =
        idx.get(e.source) ??
        (inSession
          ? ((session?.premises.find((p) => p.id === e.source) as Node | undefined) ??
            (session?.session_authorities ?? []).find((a) => a.id === e.source))
          : undefined);
      const tgt =
        idx.get(e.target) ??
        (inSession
          ? ((session?.premises.find((p) => p.id === e.target) as Node | undefined) ??
            (session?.session_authorities ?? []).find((a) => a.id === e.target))
          : undefined);
      if (!src || !tgt) return; // V-NODE-1 catches missing refs
      if (!allowed.source_types.includes(src.type as NodeType)) {
        out.push({
          rule_id: "V-EDGE-1",
          severity: "error",
          edge_id: e.id,
          message: `${e.type} source type ${src.type} not allowed (allowed: ${allowed.source_types.join(", ")}).`,
        });
      }
      if (!allowed.target_types.includes(tgt.type as NodeType)) {
        out.push({
          rule_id: "V-EDGE-1",
          severity: "error",
          edge_id: e.id,
          message: `${e.type} target type ${tgt.type} not allowed (allowed: ${allowed.target_types.join(", ")}).`,
        });
      }
    };
    for (const e of [...frame.edges].sort((a, b) => a.id.localeCompare(b.id))) checkEdge(e, false);
    if (session) {
      for (const e of [...session.argument_edges].sort((a, b) => a.id.localeCompare(b.id))) {
        checkEdge(e, true);
      }
    }
    return out;
  },
};

const V_EDGE_2: ValidationRule = {
  id: "V-EDGE-2",
  severity: "error",
  description:
    "No duplicate edges of a given (type, source, target). FORECLOSES exempt; SUPPORTS/CONTRADICTS warn on weight conflict.",
  evaluate(frame, session) {
    const out: ValidationResult[] = [];
    const seen = new Map<string, string[]>();
    const consider = (e: Edge): void => {
      if (e.type === "FORECLOSES") return;
      const key = `${e.type}|${e.source}|${e.target}`;
      const arr = seen.get(key) ?? [];
      arr.push(e.id);
      seen.set(key, arr);
    };
    for (const e of frame.edges) consider(e);
    if (session) for (const e of session.argument_edges) consider(e);
    for (const key of sortedIds(seen.keys())) {
      const arr = (seen.get(key) ?? []).slice().sort((a, b) => a.localeCompare(b));
      if (arr.length > 1) {
        for (let i = 1; i < arr.length; i++) {
          out.push({
            rule_id: "V-EDGE-2",
            severity: "error",
            edge_id: arr[i],
            message: `Duplicate edge ${key} (first: ${arr[0]}).`,
          });
        }
      }
    }
    return out;
  },
};

const V_EDGE_3: ValidationRule = {
  id: "V-EDGE-3",
  severity: "error",
  description:
    "Argument-layer edges (ANSWERS, SUPPORTS, CONTRADICTS) live in ArgumentSession.argument_edges, not in FrameVersion.edges.",
  evaluate(frame) {
    const out: ValidationResult[] = [];
    for (const e of [...frame.edges].sort((a, b) => a.id.localeCompare(b.id))) {
      if (e.type === "ANSWERS" || e.type === "SUPPORTS" || e.type === "CONTRADICTS") {
        out.push({
          rule_id: "V-EDGE-3",
          severity: "error",
          edge_id: e.id,
          message: `Argument-layer edge ${e.type} present in FrameVersion.edges.`,
        });
      }
    }
    return out;
  },
};

const V_EDGE_4: ValidationRule = {
  id: "V-EDGE-4",
  severity: "error",
  description:
    "Frame-layer edges live in FrameVersion.edges, not in ArgumentSession.argument_edges.",
  evaluate(_frame, session) {
    if (!session) return [];
    const out: ValidationResult[] = [];
    const argTypes = new Set<EdgeType>(["ANSWERS", "SUPPORTS", "CONTRADICTS"]);
    for (const e of [...session.argument_edges].sort((a, b) => a.id.localeCompare(b.id))) {
      if (!argTypes.has(e.type)) {
        out.push({
          rule_id: "V-EDGE-4",
          severity: "error",
          edge_id: e.id,
          message: `Frame-layer edge ${e.type} present in ArgumentSession.argument_edges.`,
        });
      }
    }
    return out;
  },
};

// §15 F-10. V-EDGE-3/4 check storage location but not the .layer field itself.
// A DECOMPOSES_INTO with layer="argument" (or an ANSWERS with layer="frame") passes
// those rules clean; consumers that branch on e.layer silently misclassify it.
const FRAME_LAYER_EDGE_TYPES = new Set<EdgeType>([
  "DECOMPOSES_INTO",
  "TURNS_ON",
  "INTERPRETED_AS",
  "LEADS_TO",
  "FORECLOSES",
  "GATES",
  "CITES",
  "BINDING_IN",
  "DISTINGUISHED_BY",
]);
const ARGUMENT_LAYER_EDGE_TYPES = new Set<EdgeType>(["ANSWERS", "SUPPORTS", "CONTRADICTS"]);

const V_EDGE_5: ValidationRule = {
  id: "V-EDGE-5",
  severity: "error",
  description:
    "Every edge's .layer field matches the layer declared by its type: frame-layer types need layer='frame'; argument-layer types need layer='argument'.",
  evaluate(frame, session) {
    const out: ValidationResult[] = [];
    const checkEdge = (e: Edge): void => {
      const expected = FRAME_LAYER_EDGE_TYPES.has(e.type)
        ? "frame"
        : ARGUMENT_LAYER_EDGE_TYPES.has(e.type)
          ? "argument"
          : null;
      if (expected !== null && e.layer !== expected) {
        out.push({
          rule_id: "V-EDGE-5",
          severity: "error",
          edge_id: e.id,
          message: `Edge ${e.id} (type ${e.type}) must have layer="${expected}" but has "${e.layer}".`,
        });
      }
    };
    for (const e of [...frame.edges].sort((a, b) => a.id.localeCompare(b.id))) checkEdge(e);
    if (session) {
      for (const e of [...session.argument_edges].sort((a, b) => a.id.localeCompare(b.id))) {
        checkEdge(e);
      }
    }
    return out;
  },
};

// ============================================================================
// V-GATE-1..6
// ============================================================================

const V_GATE_1: ValidationRule = {
  id: "V-GATE-1",
  severity: "error",
  description: "AND and OR gates have at least 2 entries in inputs.",
  evaluate(frame) {
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "LogicalGate") continue;
      const g = n as { gate_type: string; inputs?: NodeRef[] };
      if (g.gate_type === "AND" || g.gate_type === "OR") {
        const len = g.inputs?.length ?? 0;
        if (len < 2) {
          out.push({
            rule_id: "V-GATE-1",
            severity: "error",
            node_id: n.id,
            message: `${g.gate_type} gate ${n.id} has ${len} inputs; need ≥2.`,
          });
        }
      }
    }
    return out;
  },
};

const V_GATE_2: ValidationRule = {
  id: "V-GATE-2",
  severity: "error",
  description: "NOT gates carry exactly one input NodeRef.",
  evaluate(frame) {
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "LogicalGate") continue;
      const g = n as { gate_type: string; input?: NodeRef };
      if (g.gate_type === "NOT") {
        if (!g.input || typeof g.input !== "string") {
          out.push({
            rule_id: "V-GATE-2",
            severity: "error",
            node_id: n.id,
            message: `NOT gate ${n.id} missing input.`,
          });
        }
      }
    }
    return out;
  },
};

const V_GATE_3: ValidationRule = {
  id: "V-GATE-3",
  severity: "error",
  description: "IF_THEN gates carry exactly one antecedent and one consequent.",
  evaluate(frame) {
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "LogicalGate") continue;
      const g = n as { gate_type: string; antecedent?: NodeRef; consequent?: NodeRef };
      if (g.gate_type === "IF_THEN") {
        if (!g.antecedent || !g.consequent) {
          out.push({
            rule_id: "V-GATE-3",
            severity: "error",
            node_id: n.id,
            message: `IF_THEN gate ${n.id} missing antecedent or consequent.`,
          });
        }
      }
    }
    return out;
  },
};

const V_GATE_4: ValidationRule = {
  id: "V-GATE-4",
  severity: "error",
  description: "UNLESS gates carry exactly one main and one exception.",
  evaluate(frame) {
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "LogicalGate") continue;
      const g = n as { gate_type: string; main?: NodeRef; exception?: NodeRef };
      if (g.gate_type === "UNLESS") {
        if (!g.main || !g.exception) {
          out.push({
            rule_id: "V-GATE-4",
            severity: "error",
            node_id: n.id,
            message: `UNLESS gate ${n.id} missing main or exception.`,
          });
        }
      }
    }
    return out;
  },
};

function collectGateInputs(gate: Node): NodeRef[] {
  if (gate.type !== "LogicalGate") return [];
  const g = gate as {
    gate_type: string;
    inputs?: NodeRef[];
    input?: NodeRef;
    antecedent?: NodeRef;
    consequent?: NodeRef;
    main?: NodeRef;
    exception?: NodeRef;
  };
  const refs: NodeRef[] = [];
  if (g.inputs) refs.push(...g.inputs);
  if (g.input) refs.push(g.input);
  if (g.antecedent) refs.push(g.antecedent);
  if (g.consequent) refs.push(g.consequent);
  if (g.main) refs.push(g.main);
  if (g.exception) refs.push(g.exception);
  return refs;
}

const V_GATE_5: ValidationRule = {
  id: "V-GATE-5",
  severity: "error",
  description: "No gate input is a Term node.",
  evaluate(frame) {
    const idx = indexNodes(frame);
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "LogicalGate") continue;
      for (const ref of collectGateInputs(n)) {
        const t = idx.get(ref);
        if (t?.type === "Term") {
          out.push({
            rule_id: "V-GATE-5",
            severity: "error",
            node_id: n.id,
            message: `Gate ${n.id} input ${ref} is a Term (forbidden; use an Interpretation).`,
          });
        }
      }
    }
    return out;
  },
};

const V_GATE_6: ValidationRule = {
  id: "V-GATE-6",
  severity: "error",
  description: "No gate input is a Premise or Authority (wrong layer).",
  evaluate(frame) {
    const idx = indexNodes(frame);
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "LogicalGate") continue;
      for (const ref of collectGateInputs(n)) {
        const t = idx.get(ref);
        if (t?.type === "Premise" || t?.type === "Authority") {
          out.push({
            rule_id: "V-GATE-6",
            severity: "error",
            node_id: n.id,
            message: `Gate ${n.id} input ${ref} is a ${t.type} (forbidden; wrong layer).`,
          });
        }
      }
    }
    return out;
  },
};

// ============================================================================
// V-ARG-1..8
// ============================================================================

const V_ARG_1: ValidationRule = {
  id: "V-ARG-1",
  severity: "error",
  description:
    "Every CheckpointResponse references a Checkpoint that exists in frame_version_snapshot.",
  evaluate(_frame, session) {
    if (!session) return [];
    const snapshotIds = new Set(session.frame_version_snapshot.nodes.map((n) => n.id));
    const out: ValidationResult[] = [];
    for (const r of [...session.checkpoint_responses].sort((a, b) =>
      a.checkpoint_id.localeCompare(b.checkpoint_id),
    )) {
      if (!snapshotIds.has(r.checkpoint_id)) {
        out.push({
          rule_id: "V-ARG-1",
          severity: "error",
          node_id: r.checkpoint_id,
          message: `CheckpointResponse references missing Checkpoint ${r.checkpoint_id}.`,
        });
      }
    }
    return out;
  },
};

const V_ARG_2: ValidationRule = {
  id: "V-ARG-2",
  severity: "error",
  description:
    "Every Premise answering a Checkpoint with requires_authority: true has a non-null authority_ref.",
  evaluate(_frame, session) {
    if (!session) return [];
    const cpById = new Map<string, Checkpoint>();
    for (const n of session.frame_version_snapshot.nodes) {
      if (n.type === "Checkpoint") cpById.set(n.id, n as Checkpoint);
    }
    const premiseById = new Map(session.premises.map((p) => [p.id, p]));
    const out: ValidationResult[] = [];
    for (const r of [...session.checkpoint_responses].sort((a, b) =>
      a.checkpoint_id.localeCompare(b.checkpoint_id),
    )) {
      const cp = cpById.get(r.checkpoint_id);
      if (!cp || !cp.requires_authority) continue;
      const p = premiseById.get(r.premise_id);
      if (!p || !p.authority_ref) {
        out.push({
          rule_id: "V-ARG-2",
          severity: "error",
          node_id: r.premise_id,
          message: `Premise ${r.premise_id} answers Checkpoint ${r.checkpoint_id} which requires authority, but has no authority_ref.`,
        });
      }
    }
    return out;
  },
};

const V_ARG_3: ValidationRule = {
  id: "V-ARG-3",
  severity: "error",
  description:
    "Every Premise has a kind drawn from the vocabulary corresponding to the frame's mode/flavor.",
  evaluate(_frame, session) {
    if (!session) return [];
    // F-028: prefer the explicit mode/flavor from frame_version_snapshot.
    // The Conclusion-walking inference (kept as a fallback for unsnapped
    // legacy versions) reads false during mid-construction — e.g. a legal
    // frame without Conclusions yet looks "general", letting through
    // legal-only premise kinds without warning.
    const snap = session.frame_version_snapshot;
    let vocab: PremiseKindVocabularyKey;
    if (snap.mode) {
      vocab = toModeFlavor(snap.mode, snap.flavor) as PremiseKindVocabularyKey;
    } else {
      const isLegal = snap.nodes.some(
        (n) => n.type === "Conclusion" && (n as Conclusion).direction.kind === "legal",
      );
      // F-12: pass flavor through. Defaulting flavor to academic silently
      // mis-validates premises on personal-flavor legacy frames whose
      // FrameVersion was minted before the F-028 snapshot fields existed.
      vocab = vocabularyFor(isLegal ? "legal" : "general", snap.flavor);
    }
    const allowed = new Set<string>(PREMISE_KIND_VOCABULARIES[vocab] as readonly string[]);
    const out: ValidationResult[] = [];
    for (const p of [...session.premises].sort((a, b) => a.id.localeCompare(b.id))) {
      if (!allowed.has(p.kind)) {
        out.push({
          rule_id: "V-ARG-3",
          severity: "error",
          node_id: p.id,
          message: `Premise ${p.id} kind "${p.kind}" is not in the ${vocab} vocabulary.`,
        });
      }
    }
    return out;
  },
};

const V_ARG_4: ValidationRule = {
  id: "V-ARG-4",
  severity: "error",
  description:
    "Every authority_ref resolves to an Authority node in frame_version_snapshot or session_authorities.",
  evaluate(_frame, session) {
    if (!session) return [];
    const authorities = new Set<string>();
    for (const n of session.frame_version_snapshot.nodes) {
      if (n.type === "Authority") authorities.add(n.id);
    }
    for (const a of session.session_authorities ?? []) authorities.add(a.id);
    const out: ValidationResult[] = [];
    for (const p of [...session.premises].sort((a, b) => a.id.localeCompare(b.id))) {
      if (p.authority_ref && !authorities.has(p.authority_ref)) {
        out.push({
          rule_id: "V-ARG-4",
          severity: "error",
          node_id: p.id,
          message: `Premise ${p.id} authority_ref ${p.authority_ref} does not resolve to an Authority.`,
        });
      }
    }
    return out;
  },
};

const V_ARG_5: ValidationRule = {
  id: "V-ARG-5",
  severity: "warning",
  description:
    "If a Checkpoint has both ANSWERS and CONTRADICTS edges from different Premises, surface a contested warning.",
  evaluate(_frame, session) {
    if (!session) return [];
    const answersByTarget = new Map<string, Set<string>>();
    const contradictsByTarget = new Map<string, Set<string>>();
    for (const e of session.argument_edges) {
      if (e.type === "ANSWERS") {
        const s = answersByTarget.get(e.target) ?? new Set<string>();
        s.add(e.source);
        answersByTarget.set(e.target, s);
      } else if (e.type === "CONTRADICTS") {
        const s = contradictsByTarget.get(e.target) ?? new Set<string>();
        s.add(e.source);
        contradictsByTarget.set(e.target, s);
      }
    }
    const out: ValidationResult[] = [];
    for (const target of sortedIds(answersByTarget.keys())) {
      const a = answersByTarget.get(target);
      const c = contradictsByTarget.get(target);
      if (!a || !c) continue;
      // distinct Premises required
      let distinct = false;
      for (const x of sortedIds(c)) if (!a.has(x)) distinct = true;
      if (distinct) {
        out.push({
          rule_id: "V-ARG-5",
          severity: "warning",
          node_id: target,
          message: `Checkpoint ${target} has ANSWERS and CONTRADICTS from different Premises (contested).`,
        });
      }
    }
    return out;
  },
};

const V_ARG_6: ValidationRule = {
  id: "V-ARG-6",
  severity: "error",
  description:
    "Every selected interpretation in an InterpretationSelection is a child of the named term via INTERPRETED_AS in frame_version_snapshot.",
  evaluate(_frame, session) {
    if (!session) return [];
    const snapshotEdges = session.frame_version_snapshot.edges;
    // term_id → set of interpretation ids
    const map = new Map<string, Set<string>>();
    for (const e of snapshotEdges) {
      if (e.type !== "INTERPRETED_AS") continue;
      const s = map.get(e.source) ?? new Set<string>();
      s.add(e.target);
      map.set(e.source, s);
    }
    const out: ValidationResult[] = [];
    for (const sel of [...session.interpretation_selections].sort((a, b) =>
      a.term_id.localeCompare(b.term_id),
    )) {
      const allowed = map.get(sel.term_id) ?? new Set<string>();
      for (const id of [...sel.selected_interpretation_ids].sort((a, b) => a.localeCompare(b))) {
        if (!allowed.has(id)) {
          out.push({
            rule_id: "V-ARG-6",
            severity: "error",
            node_id: id,
            message: `InterpretationSelection.term_id ${sel.term_id}: ${id} is not a child INTERPRETED_AS of that Term.`,
          });
        }
      }
    }
    return out;
  },
};

const V_ARG_7: ValidationRule = {
  id: "V-ARG-7",
  severity: "warning",
  description:
    "Every Term reachable from the active path has at least one InterpretationSelection record.",
  evaluate(_frame, session) {
    if (!session) return [];
    if (!session.active_path || session.active_path.length === 0) return [];
    const onPath = new Set(session.active_path);
    const haveSelection = new Set(session.interpretation_selections.map((s) => s.term_id));
    const out: ValidationResult[] = [];
    for (const n of [...session.frame_version_snapshot.nodes].sort((a, b) =>
      a.id.localeCompare(b.id),
    )) {
      if (n.type !== "Term") continue;
      if (!onPath.has(n.id)) continue;
      if (!haveSelection.has(n.id)) {
        out.push({
          rule_id: "V-ARG-7",
          severity: "warning",
          node_id: n.id,
          message: `Term ${n.id} is on the active path but has no InterpretationSelection.`,
        });
      }
    }
    return out;
  },
};

const V_ARG_8: ValidationRule = {
  id: "V-ARG-8",
  severity: "warning",
  description:
    "InterpretationSelection on a Term whose linked_to is non-null is allowed but warns; linked target's selection takes precedence.",
  evaluate(_frame, session) {
    if (!session) return [];
    const termById = new Map<string, Term>();
    for (const n of session.frame_version_snapshot.nodes) {
      if (n.type === "Term") termById.set(n.id, n as Term);
    }
    const out: ValidationResult[] = [];
    for (const sel of [...session.interpretation_selections].sort((a, b) =>
      a.term_id.localeCompare(b.term_id),
    )) {
      const t = termById.get(sel.term_id);
      if (t && t.linked_to) {
        out.push({
          rule_id: "V-ARG-8",
          severity: "warning",
          node_id: sel.term_id,
          message: `Term ${sel.term_id} is linked_to ${t.linked_to}; selection on the linked target takes precedence.`,
        });
      }
    }
    return out;
  },
};

// F-5: cross-check selected_option_id against the Checkpoint's options list.
// Without this, deleting an option the user previously selected leaves a
// dangling reference and the runtime silently produces no target.
const V_ARG_9: ValidationRule = {
  id: "V-ARG-9",
  severity: "error",
  description:
    "Every CheckpointResponse.selected_option_id and AnswersEdge.selected_option_id references a real CheckpointOption on the target Checkpoint.",
  evaluate(_frame, session) {
    if (!session) return [];
    const cpById = new Map<string, Checkpoint>();
    for (const n of session.frame_version_snapshot.nodes) {
      if (n.type === "Checkpoint") cpById.set(n.id, n as Checkpoint);
    }
    const out: ValidationResult[] = [];
    for (const r of [...session.checkpoint_responses].sort((a, b) =>
      a.checkpoint_id.localeCompare(b.checkpoint_id),
    )) {
      // selected_option_id is optional on CheckpointResponse; only validate
      // when it's set.
      const sel = (r as { selected_option_id?: string }).selected_option_id;
      if (sel === undefined) continue;
      const cp = cpById.get(r.checkpoint_id);
      if (!cp) continue; // V-ARG-1 already flagged the missing Checkpoint.
      if (!cp.options.some((o) => o.id === sel)) {
        out.push({
          rule_id: "V-ARG-9",
          severity: "error",
          node_id: r.checkpoint_id,
          message: `CheckpointResponse for ${r.checkpoint_id} references option "${sel}" which no longer exists.`,
        });
      }
    }
    // ANSWERS edges may also carry selected_option_id (per AnswersEdge).
    for (const e of [...session.frame_version_snapshot.edges].sort((a, b) =>
      a.id.localeCompare(b.id),
    )) {
      if (e.type !== "ANSWERS") continue;
      const sel = (e as { selected_option_id?: string }).selected_option_id;
      if (sel === undefined) continue;
      const cp = cpById.get(e.target);
      if (!cp) continue;
      if (!cp.options.some((o) => o.id === sel)) {
        out.push({
          rule_id: "V-ARG-9",
          severity: "error",
          node_id: e.target,
          message: `ANSWERS edge ${e.id} references option "${sel}" which no longer exists on Checkpoint ${e.target}.`,
        });
      }
    }
    return out;
  },
};

// F-14: every Checkpoint has at least one option and every option carries a
// non-empty id + label. V-NODE-5/6/7 covered specific answer_type counts; this
// rule covers the universal "must have an option" floor.
const V_NODE_10: ValidationRule = {
  id: "V-NODE-10",
  severity: "error",
  description:
    "Every Checkpoint has at least one option, and every option has a non-empty id and label.",
  evaluate(frame) {
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "Checkpoint") continue;
      const c = n as Checkpoint;
      if (c.options.length === 0) {
        out.push({
          rule_id: "V-NODE-10",
          severity: "error",
          node_id: n.id,
          message: `Checkpoint ${n.id} has no options; users have nothing to pick.`,
        });
        continue;
      }
      for (const opt of [...c.options].sort((a, b) => a.id.localeCompare(b.id))) {
        if (!opt.id || opt.id.trim().length === 0) {
          out.push({
            rule_id: "V-NODE-10",
            severity: "error",
            node_id: n.id,
            message: `Checkpoint ${n.id} has an option with an empty id.`,
          });
        }
        if (!opt.label || opt.label.trim().length === 0) {
          out.push({
            rule_id: "V-NODE-10",
            severity: "error",
            node_id: n.id,
            message: `Checkpoint ${n.id} option "${opt.id}" has an empty label.`,
          });
        }
      }
    }
    return out;
  },
};

// §15 F-9. Authority is the only node type whose `layer` is multi-valued
// ("frame" | "argument"). Without this rule a programmatic edit or buggy
// migration can land an Authority with layer="argument" inside frame.nodes
// (or layer="frame" inside session.session_authorities), and any downstream
// consumer that filters by layer silently drops it (e.g., frame-canvas's
// `.filter(n => n.layer === "frame")`).
const V_NODE_11: ValidationRule = {
  id: "V-NODE-11",
  severity: "error",
  description:
    "Authority nodes carry a layer that matches their container: frame-layer for frame.nodes Authorities, argument-layer for session.session_authorities.",
  evaluate(frame, session) {
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type !== "Authority") continue;
      const a = n as Authority;
      if (a.layer !== "frame") {
        out.push({
          rule_id: "V-NODE-11",
          severity: "error",
          node_id: n.id,
          message: `Authority ${n.id} is stored in frame.nodes but has layer="${a.layer}"; expected "frame".`,
        });
      }
    }
    if (session) {
      for (const a of [...(session.session_authorities ?? [])].sort((x, y) =>
        x.id.localeCompare(y.id),
      )) {
        if (a.layer !== "argument") {
          out.push({
            rule_id: "V-NODE-11",
            severity: "error",
            node_id: a.id,
            message: `Authority ${a.id} is stored in session.session_authorities but has layer="${a.layer}"; expected "argument".`,
          });
        }
      }
    }
    return out;
  },
};

// §15 F-10 (node side). Every non-Authority node's .layer must match the layer
// declared by its type. RootQuestion/SubQuestion/Term/Interpretation/Checkpoint/
// LogicalGate/Conclusion are always frame-layer; Premise is always argument-layer.
// Authority is multi-valued and handled by V-NODE-11 (container-based check).
const FRAME_ONLY_NODE_TYPES = new Set<NodeType>([
  "RootQuestion",
  "SubQuestion",
  "Term",
  "Interpretation",
  "Checkpoint",
  "LogicalGate",
  "Conclusion",
]);

const V_NODE_12: ValidationRule = {
  id: "V-NODE-12",
  severity: "error",
  description:
    "Every non-Authority node's .layer field matches the layer declared by its type: frame-only types need layer='frame'; Premise needs layer='argument'. (Authority handled by V-NODE-11.)",
  evaluate(frame, session) {
    const out: ValidationResult[] = [];
    for (const n of [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (n.type === "Authority") continue;
      if (FRAME_ONLY_NODE_TYPES.has(n.type) && n.layer !== "frame") {
        out.push({
          rule_id: "V-NODE-12",
          severity: "error",
          node_id: n.id,
          message: `Node ${n.id} (type ${n.type}) must have layer="frame" but has "${n.layer}".`,
        });
      }
      if (n.type === "Premise" && (n.layer as string) !== "argument") {
        out.push({
          rule_id: "V-NODE-12",
          severity: "error",
          node_id: n.id,
          message: `Premise ${n.id} must have layer="argument" but has "${n.layer as string}".`,
        });
      }
    }
    if (session) {
      for (const p of [...session.premises].sort((a, b) => a.id.localeCompare(b.id))) {
        // Cast: TS knows layer:"argument" is the literal type, but database data
        // may deliver a different string at runtime — this rule exists for that case.
        if ((p.layer as string) !== "argument") {
          out.push({
            rule_id: "V-NODE-12",
            severity: "error",
            node_id: p.id,
            message: `Premise ${p.id} in session.premises must have layer="argument" but has "${p.layer as string}".`,
          });
        }
      }
    }
    return out;
  },
};

// ============================================================================
// Full registry
// ============================================================================

export const VALIDATION_RULES: ReadonlyArray<ValidationRule> = [
  V_FR_1,
  V_FR_2,
  V_FR_3,
  V_FR_4,
  V_FR_5,
  V_FR_6,
  V_FR_7,
  V_FR_8,
  V_FR_9,
  V_FR_10,
  V_FR_11,
  V_FR_12,
  V_NODE_1,
  V_NODE_2,
  V_NODE_3,
  V_NODE_4,
  V_NODE_5,
  V_NODE_6,
  V_NODE_7,
  V_NODE_8,
  V_NODE_9,
  V_NODE_10,
  V_NODE_11,
  V_NODE_12,
  V_EDGE_1,
  V_EDGE_2,
  V_EDGE_3,
  V_EDGE_4,
  V_EDGE_5,
  V_GATE_1,
  V_GATE_2,
  V_GATE_3,
  V_GATE_4,
  V_GATE_5,
  V_GATE_6,
  V_ARG_1,
  V_ARG_2,
  V_ARG_3,
  V_ARG_4,
  V_ARG_5,
  V_ARG_6,
  V_ARG_7,
  V_ARG_8,
  V_ARG_9,
];

// Priority map: rule_id → index, for canonical ordering of ValidationResults.
export const VALIDATION_RULE_PRIORITY: Readonly<Record<string, number>> = Object.fromEntries(
  VALIDATION_RULES.map((r, i) => [r.id, i]),
);

/**
 * Rule-id → human description. P2: validation-row used to set the message
 * span's title to the bare rule_id (e.g., "V-NODE-8"), which read like a
 * compiler diagnostic. The lookup lets the UI show the rule's intent on
 * hover instead.
 */
export const VALIDATION_RULE_DESCRIPTIONS: Readonly<Record<string, string>> = Object.fromEntries(
  VALIDATION_RULES.map((r) => [r.id, r.description]),
);

// Re-export for tests
export type { NodeStatus };
