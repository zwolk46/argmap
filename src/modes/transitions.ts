import type {
  FrameVersion,
  ArgumentSession,
  Mode,
  Flavor,
  ValidationResult,
  Position,
} from "@/schema";
import type { ComputeResult } from "@/runtime";

export const TRANSITION_KINDS = [
  "frame_to_argument",
  "argument_to_frame",
  "architectural",
  "flavor",
] as const;
export type TransitionKind = (typeof TRANSITION_KINDS)[number];

export interface TransitionResult {
  ok: boolean;
  blocking: ValidationResult[];
  advisory: ValidationResult[];
  inline_editors?: ConclusionDirectionEditor[];
}

export interface ConclusionDirectionEditor {
  node_id: string;
  current_direction_kind: "legal" | "general";
  required_direction_kind: "legal" | "general";
  options: { value: string; label: string }[];
}

// Mirrors ConclusionDirection legal values from @/schema; must stay in sync.
// The test "LEGAL_DIRECTION_VALUES matches @/schema's exported LegalDirection enum" pins this.
export const LEGAL_DIRECTION_VALUES = [
  "affirm",
  "custom",
  "dismiss",
  "favors_defendant",
  "favors_plaintiff",
  "remand",
  "reverse",
] as const;

export function attemptTransition(
  kind: TransitionKind,
  current: {
    frame: FrameVersion;
    session?: ArgumentSession;
    mode?: Mode;
    flavor?: Flavor;
    positions?: Position[];
  },
  target: { mode?: Mode; flavor?: Flavor },
  precomputed?: { compute_result?: ComputeResult; validation?: ValidationResult[] },
): TransitionResult {
  switch (kind) {
    case "frame_to_argument":
      return attemptFrameToArgument(current.frame, precomputed);
    case "argument_to_frame":
      return attemptArgumentToFrame(current.frame, current.session);
    case "architectural":
      return scanArchitecturalModeChange(
        current.frame,
        current.mode!,
        target.mode!,
        current.positions,
      );
    case "flavor":
      return scanFlavorChange(current.frame, current.flavor!, target.flavor!);
  }
}

function attemptFrameToArgument(
  _frame: FrameVersion,
  precomputed: { compute_result?: ComputeResult; validation?: ValidationResult[] } | undefined,
): TransitionResult {
  const validation = precomputed?.compute_result?.validation_results ?? precomputed?.validation;
  if (!validation) {
    throw new Error(
      "attemptTransition('frame_to_argument'): precomputed.compute_result or " +
        "precomputed.validation must be supplied — modes does not call compute() " +
        "(see in-session flag, F-003 family).",
    );
  }
  const blocking = [...validation].filter((v) => v.severity === "error");
  const advisory = [...validation].filter((v) => v.severity === "warning");
  return { ok: blocking.length === 0, blocking, advisory };
}

function attemptArgumentToFrame(
  frame: FrameVersion,
  session: ArgumentSession | undefined,
): TransitionResult {
  const advisory: ValidationResult[] = [];
  if (session && session.frame_version_id !== frame.id) {
    advisory.push({
      rule_id: "MODE-DRIFT-ADVISORY",
      severity: "warning",
      message:
        `This session is built against frame version ${session.frame_version_id}; ` +
        `the frame is now at version ${frame.id}. Consider migrating before resuming.`,
    });
  }
  return { ok: true, blocking: [], advisory };
}

export function scanArchitecturalModeChange(
  frame: FrameVersion,
  _current_mode: Mode,
  target_mode: Mode,
  positions?: Position[],
): TransitionResult {
  const blocking: ValidationResult[] = [];
  const advisory: ValidationResult[] = [];
  const inline_editors: ConclusionDirectionEditor[] = [];

  const nodes = [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id));

  for (const n of nodes) {
    if (n.type === "Conclusion") {
      const dir_kind = n.direction.kind;
      const required_kind = target_mode === "legal" ? "legal" : "general";
      if (dir_kind !== required_kind) {
        blocking.push({
          rule_id: "MODE-CHANGE-CONCLUSION-DIRECTION",
          severity: "error",
          node_id: n.id,
          message:
            `Conclusion '${n.statement ?? n.id}' has direction.kind = "${dir_kind}"; ` +
            `mode '${target_mode}' requires "${required_kind}".`,
        });
        inline_editors.push({
          node_id: n.id,
          current_direction_kind: dir_kind,
          required_direction_kind: required_kind,
          options:
            required_kind === "legal"
              ? LEGAL_DIRECTION_VALUES.map((v) => ({ value: v, label: v }))
              : (positions ?? []).map((p) => ({ value: p.id, label: p.label })),
        });
      }
    }

    if (n.type === "Checkpoint" && n.requires_authority === true && target_mode === "general") {
      advisory.push({
        rule_id: "MODE-CHANGE-REQUIRES-AUTHORITY-INERT",
        severity: "warning",
        node_id: n.id,
        message:
          `Checkpoint '${n.id}' has requires_authority = true; this flag is ` +
          `legal-only and becomes inactive metadata in general mode (data preserved).`,
      });
    }

    if (n.type === "SubQuestion" && n.is_jurisdictional === true && target_mode === "general") {
      advisory.push({
        rule_id: "MODE-CHANGE-IS-JURISDICTIONAL-INERT",
        severity: "warning",
        node_id: n.id,
        message:
          `SubQuestion '${n.id}' has is_jurisdictional = true; this flag is ` +
          `legal-only and becomes inactive metadata in general mode (data preserved).`,
      });
    }

    if (
      (n.type === "RootQuestion" || n.type === "SubQuestion") &&
      n.standard_of_review !== undefined &&
      target_mode === "general"
    ) {
      advisory.push({
        rule_id: "MODE-CHANGE-STANDARD-OF-REVIEW-INERT",
        severity: "warning",
        node_id: n.id,
        message:
          `${n.type} '${n.id}' has standard_of_review set; this field is ` +
          `legal-only and becomes inactive metadata in general mode (data preserved).`,
      });
    }

    if (n.type === "Authority") {
      const has_legal_only =
        n.court !== undefined ||
        n.year !== undefined ||
        n.is_binding !== undefined ||
        n.binding_in !== undefined;
      if (has_legal_only && target_mode === "general") {
        advisory.push({
          rule_id: "MODE-CHANGE-AUTHORITY-LEGAL-FIELDS-INERT",
          severity: "warning",
          node_id: n.id,
          message:
            `Authority '${n.id}' has legal-only fields set (court, year, ` +
            `is_binding, binding_in); these become inactive metadata in general mode.`,
        });
      }
    }
  }

  return {
    ok: blocking.length === 0,
    blocking,
    advisory,
    inline_editors: inline_editors.length > 0 ? inline_editors : undefined,
  };
}

export function scanFlavorChange(
  frame: FrameVersion,
  current_flavor: Flavor,
  target_flavor: Flavor,
): TransitionResult {
  const advisory: ValidationResult[] = [];

  if (current_flavor !== target_flavor) {
    const nodes = [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id));
    const authority_nodes = nodes.filter((n) => n.type === "Authority");
    if (authority_nodes.length > 0) {
      if (target_flavor === "personal") {
        advisory.push({
          rule_id: "FLAVOR-CHANGE-AUTHORITY-HIDDEN",
          severity: "warning",
          message:
            `${authority_nodes.length} Authority node(s) will be hidden by default ` +
            `in personal flavor. Re-enable via the per-frame "enable Source fields" toggle.`,
        });
      } else if (target_flavor === "academic") {
        advisory.push({
          rule_id: "FLAVOR-CHANGE-AUTHORITY-RELABELED",
          severity: "warning",
          message:
            `${authority_nodes.length} Authority node(s) will be relabeled to "Source" ` +
            `with academic-flavor field visibility (author, venue, position).`,
        });
      }
    }
  }

  return { ok: true, blocking: [], advisory };
}
