/**
 * Tutorial fixture — a COMPLETE worked example of negligence analysis.
 *
 * The example: Palsgraf v. Long Island R.R., 248 N.Y. 339 (1928) — fitted out
 * as a full four-element negligence frame instead of a single-question chain.
 * A negligence claim requires four elements, and the frame must answer ALL of
 * them, joined by a Logical AND Gate, before the railroad can be liable:
 *
 *   1. Duty       — did the railroad owe Mrs. Palsgraf a duty of care?
 *   2. Breach     — did the railroad fall below that duty's standard?
 *   3. Causation  — was the conduct the proximate cause of her injury?
 *   4. Damages    — did she suffer compensable harm?
 *
 * The Duty element is contested between two reading of "scope of duty":
 *   • Cardozo (majority): zone-of-foreseeable-danger test. Narrow. Mrs.
 *     Palsgraf was far from the dropped fireworks → no duty → liability
 *     fails at element 1, the rest are moot.
 *   • Andrews (dissent): every actor owes a duty to the world; liability
 *     follows the unbroken chain of proximate cause. Broader.
 *
 * The other three elements (Breach / Causation / Damages) each have a single
 * canonical Interpretation in this tutorial — we don't fork them across
 * competing readings because the point of the example is to show the
 * Cardozo/Andrews split, not to triple every element. Each still has its own
 * Checkpoint fed by a stipulated Premise.
 *
 * The session this fixture preloads:
 *   – Selects Cardozo's interpretation for Duty.
 *   – Stipulates Mrs. Palsgraf was outside the foreseeable zone → answers
 *     the Duty Checkpoint "No".
 *   – Stipulates favorable facts for Breach, Causation, Damages (all "Yes")
 *     so the user can SEE that those elements would have been met but
 *     it doesn't matter — the Duty failure short-circuits the AND Gate.
 *
 * Runtime resolution under those inputs:
 *   – Duty Checkpoint = NO → SubQuestion "Duty" unsatisfied.
 *   – Breach / Causation / Damages Checkpoints = YES → those SubQuestions
 *     satisfied.
 *   – AND Gate requires ALL four → unsatisfied → liability conclusion does
 *     not fire → Not Liable Conclusion is the resolved output.
 *
 * Pedagogy: the tour walks each element, then shows the gate, then traces
 * the path under Cardozo so the user sees exactly how a single failed
 * element fails the whole claim — a determinate "not liable" without
 * needing to argue breach, cause, or damages.
 *
 * Every node type the spec defines is exercised: RootQuestion, SubQuestion,
 * Term, Interpretation (×5), Checkpoint (×4), LogicalGate (AND), Conclusion
 * (×2), Authority.
 */
import type {
  Frame,
  FrameVersion,
  Node,
  Edge,
  ArgumentSession,
  ArgumentSessionVersion,
  RootQuestion,
  SubQuestion,
  Term,
  Interpretation,
  Checkpoint,
  Conclusion,
  Authority,
  Premise,
  CheckpointResponse,
  InterpretationSelection,
  NodeRef,
} from "@/schema";

export const TUTORIAL_TITLE = "Tutorial: Palsgraf v. Long Island R.R.";
export const TUTORIAL_DESCRIPTION =
  "A complete worked frame for negligence — duty, breach, causation, damages combined through an AND Gate — applied to Palsgraf v. Long Island R.R. The preloaded session selects Cardozo's zone-of-danger test and stipulates Mrs. Palsgraf was outside the zone, so the Duty element fails, the AND Gate fails, and the resolved output is NOT LIABLE.";

export const TUTORIAL_SESSION_TITLE = "Cardozo reading — Duty fails, gate fails";

export type TutorialNodeRole =
  | "rq"
  | "and_gate"
  | "sq_duty"
  | "sq_breach"
  | "sq_causation"
  | "sq_damages"
  | "term_duty"
  | "term_breach"
  | "term_causation"
  | "term_damages"
  | "interp_cardozo"
  | "interp_andrews"
  | "interp_breach"
  | "interp_breach_alt"
  | "interp_causation"
  | "interp_causation_alt"
  | "interp_damages"
  | "interp_damages_alt"
  | "cp_duty"
  | "cp_breach"
  | "cp_causation"
  | "cp_damages"
  | "liable"
  | "not_liable"
  | "authority";

export type TutorialRoleMap = Record<TutorialNodeRole, NodeRef>;

const N = {
  rq: "n-rq",
  and_gate: "n-and-gate",
  sq_duty: "n-sq-duty",
  sq_breach: "n-sq-breach",
  sq_causation: "n-sq-causation",
  sq_damages: "n-sq-damages",
  term_duty: "n-term-duty",
  term_breach: "n-term-breach",
  term_causation: "n-term-causation",
  term_damages: "n-term-damages",
  interp_cardozo: "n-interp-cardozo",
  interp_andrews: "n-interp-andrews",
  interp_breach: "n-interp-breach",
  interp_breach_alt: "n-interp-breach-alt",
  interp_causation: "n-interp-causation",
  interp_causation_alt: "n-interp-causation-alt",
  interp_damages: "n-interp-damages",
  interp_damages_alt: "n-interp-damages-alt",
  cp_duty: "n-cp-duty",
  cp_breach: "n-cp-breach",
  cp_causation: "n-cp-causation",
  cp_damages: "n-cp-damages",
  liable: "n-concl-liable",
  not_liable: "n-concl-not-liable",
  authority: "n-authority-palsgraf",
} as const;

// Checkpoint option ids — stable so the session's CheckpointResponse can
// refer to them by id rather than label.
const CP_OPTS = {
  duty: { yes: "duty-yes", no: "duty-no" },
  breach: { yes: "breach-yes", no: "breach-no" },
  causation: { yes: "causation-yes", no: "causation-no" },
  damages: { yes: "damages-yes", no: "damages-no" },
} as const;

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

export interface TutorialBuildOpts {
  now: string;
  generateId: () => string;
  user_id: string;
}

export interface TutorialBuildResult {
  frame: Frame;
  frame_version: FrameVersion;
  session: ArgumentSession;
  session_version: ArgumentSessionVersion;
  role_to_id: TutorialRoleMap;
}

export function buildTutorial(opts: TutorialBuildOpts): TutorialBuildResult {
  const { now, generateId, user_id } = opts;

  const id_map = new Map<string, string>();
  for (const v of Object.values(N)) id_map.set(v, generateId());
  const remap = (k: string): NodeRef => (id_map.get(k) ?? k) as NodeRef;

  // Tutorial layout — hand-positioned. We initially tried letting ELK
  // auto-layout own placement, but during the 100-500ms ELK pass nodes fall
  // through to (0,0) and read as "piled at origin" — even though they
  // resolve correctly later. For a pedagogical fixture that's the first
  // thing users see, that flash is worse than the brittleness of
  // hand-positioning, so we pin every node.
  //
  // Spacing math: the widest node type is Conclusion (300px). Column gap
  // is 600px so adjacent-column nodes have ~300px breathing room. The
  // Duty column carries two side-by-side Interpretations (Cardozo and
  // Andrews) because the case turns on that fork; we space them ±180 from
  // the column center, which leaves ~160px between the Interpretation
  // boxes and ~120px between the right edge of Andrews and the left edge
  // of the Breach column.
  //
  //   Column centers (x):  Duty=-900   Breach=-300   Causation=300   Damages=900
  //   Authority is parked further left of the Duty column.
  //
  //   Rows (y):
  //     0    RootQuestion (center)
  //     160  AndGate (center, the structural OR-of-everything)
  //     320  SubQuestion (×4, one per element column)
  //     480  Term (×4, one per column)
  //     640  Primary Interpretation. For Duty, Cardozo at col-180 and
  //          Andrews at col+180; for the other three, at column center.
  //          Authority sits at this row, far left.
  //     780  Alternative Interpretation (Breach / Causation / Damages
  //          each have one — the second reading of their Term). The
  //          Duty column has no alt at this row because Andrews already
  //          fills the side-by-side slot at y=640.
  //     940  Checkpoint (×4). cp_duty sits under Cardozo (col_duty-180);
  //          the other three at column center.
  //     1120 Conclusion: NotLiable under Cardozo's column, Liable centered
  //          under the AND Gate.
  const COL = {
    duty: -900,
    breach: -300,
    causation: 300,
    damages: 900,
  };

  const node_positions: Record<string, { x: number; y: number }> = {
    [N.rq]: { x: 0, y: 0 },
    [N.and_gate]: { x: 0, y: 160 },
    [N.sq_duty]: { x: COL.duty, y: 320 },
    [N.sq_breach]: { x: COL.breach, y: 320 },
    [N.sq_causation]: { x: COL.causation, y: 320 },
    [N.sq_damages]: { x: COL.damages, y: 320 },
    [N.term_duty]: { x: COL.duty, y: 480 },
    [N.term_breach]: { x: COL.breach, y: 480 },
    [N.term_causation]: { x: COL.causation, y: 480 },
    [N.term_damages]: { x: COL.damages, y: 480 },
    [N.interp_cardozo]: { x: COL.duty - 180, y: 640 },
    [N.interp_andrews]: { x: COL.duty + 180, y: 640 },
    [N.interp_breach]: { x: COL.breach, y: 640 },
    [N.interp_breach_alt]: { x: COL.breach, y: 820 },
    [N.interp_causation]: { x: COL.causation, y: 640 },
    [N.interp_causation_alt]: { x: COL.causation, y: 820 },
    [N.interp_damages]: { x: COL.damages, y: 640 },
    [N.interp_damages_alt]: { x: COL.damages, y: 820 },
    [N.cp_duty]: { x: COL.duty - 180, y: 1000 },
    [N.cp_breach]: { x: COL.breach, y: 1000 },
    [N.cp_causation]: { x: COL.causation, y: 1000 },
    [N.cp_damages]: { x: COL.damages, y: 1000 },
    [N.not_liable]: { x: COL.duty - 180, y: 1180 },
    [N.liable]: { x: 0, y: 1180 },
    [N.authority]: { x: COL.duty - 520, y: 640 },
  };

  function stamp(key: string) {
    return {
      id: remap(key),
      created_at: now,
      updated_at: now,
      presentation: node_positions[key],
    };
  }

  // ---------------------------------------------------------------------------
  // Nodes
  // ---------------------------------------------------------------------------

  const root: RootQuestion = {
    ...stamp(N.rq),
    type: "RootQuestion",
    layer: "frame",
    statement: "Is the railroad liable to Mrs. Palsgraf for negligence?",
    standard_of_review: "de novo (1L hypothetical)",
  };

  const and_gate: Node = {
    ...stamp(N.and_gate),
    type: "LogicalGate",
    layer: "frame",
    gate_type: "AND",
    inputs: [
      remap(N.sq_duty),
      remap(N.sq_breach),
      remap(N.sq_causation),
      remap(N.sq_damages),
    ],
    output_target: remap(N.liable),
  } as Node;

  const sq_duty: SubQuestion = {
    ...stamp(N.sq_duty),
    type: "SubQuestion",
    layer: "frame",
    statement: "DUTY — did the railroad owe Mrs. Palsgraf a duty of care?",
    is_jurisdictional: false,
  };
  const sq_breach: SubQuestion = {
    ...stamp(N.sq_breach),
    type: "SubQuestion",
    layer: "frame",
    statement: "BREACH — did the railroad fall below the standard of care?",
    is_jurisdictional: false,
  };
  const sq_causation: SubQuestion = {
    ...stamp(N.sq_causation),
    type: "SubQuestion",
    layer: "frame",
    statement: "CAUSATION — did the conduct proximately cause her injury?",
    is_jurisdictional: false,
  };
  const sq_damages: SubQuestion = {
    ...stamp(N.sq_damages),
    type: "SubQuestion",
    layer: "frame",
    statement: "DAMAGES — did Mrs. Palsgraf suffer compensable harm?",
    is_jurisdictional: false,
  };

  const term_duty: Term = {
    ...stamp(N.term_duty),
    type: "Term",
    layer: "frame",
    name: "Scope of duty",
    order: 0,
    dispositive: false,
  };
  const term_breach: Term = {
    ...stamp(N.term_breach),
    type: "Term",
    layer: "frame",
    name: "Standard of care",
    order: 1,
    dispositive: false,
  };
  const term_causation: Term = {
    ...stamp(N.term_causation),
    type: "Term",
    layer: "frame",
    name: "Proximate cause",
    order: 2,
    dispositive: false,
  };
  const term_damages: Term = {
    ...stamp(N.term_damages),
    type: "Term",
    layer: "frame",
    name: "Compensable harm",
    order: 3,
    dispositive: false,
  };

  const interp_cardozo: Interpretation = {
    ...stamp(N.interp_cardozo),
    type: "Interpretation",
    layer: "frame",
    statement:
      "Cardozo (majority): the duty of care runs only to plaintiffs within the foreseeable zone of danger created by the defendant's conduct. If the plaintiff was outside that zone, no duty was owed and the analysis ends.",
    notes:
      "The narrow test. Limits duty by the predictable reach of the harm; outside that reach there is no claim, regardless of how unreasonable the conduct was.",
  };
  const interp_andrews: Interpretation = {
    ...stamp(N.interp_andrews),
    type: "Interpretation",
    layer: "frame",
    statement:
      "Andrews (dissent): every actor owes a duty to the world to refrain from conduct that could foreseeably injure anyone. Liability follows the unbroken chain of proximate cause, regardless of the plaintiff's location.",
    notes:
      "The broad test. Pushes the limit on liability into the causation analysis instead of capping it at duty.",
  };
  const interp_breach: Interpretation = {
    ...stamp(N.interp_breach),
    type: "Interpretation",
    layer: "frame",
    statement:
      "Reasonable-person test: the railroad breached its duty if its employees' conduct fell below what a reasonable carrier in the same circumstances would have done.",
    notes:
      "Modern majority. The benchmark is what a careful actor would have done, not what the industry typically does.",
  };
  const interp_breach_alt: Interpretation = {
    ...stamp(N.interp_breach_alt),
    type: "Interpretation",
    layer: "frame",
    statement:
      "Industry-custom test: the railroad breached only if its employees' conduct fell below the established custom of carriers. Compliance with industry practice is a complete defense.",
    notes:
      "Older / minority reading (cf. The T.J. Hooper, 60 F.2d 737 (2d Cir. 1932) rejected this). More defendant-friendly: it freezes the standard at the industry's practice instead of pushing it toward reasonable care.",
  };
  const interp_causation: Interpretation = {
    ...stamp(N.interp_causation),
    type: "Interpretation",
    layer: "frame",
    statement:
      "Proximate cause: the breach is a legal cause if (a) it was the but-for cause of the injury AND (b) the chain of consequences was foreseeable.",
    notes:
      "The mainstream rule. Both prongs required — but-for alone is too broad, foreseeability alone is too narrow.",
  };
  const interp_causation_alt: Interpretation = {
    ...stamp(N.interp_causation_alt),
    type: "Interpretation",
    layer: "frame",
    statement:
      "Substantial-factor test: the breach is a legal cause if it was a substantial factor in producing the injury, without requiring strict but-for causation. Used where multiple sufficient causes converge.",
    notes:
      "Restatement (Second) of Torts § 431. Used for overdetermined causation (e.g., two fires that each would have destroyed the house) — broader than but-for + foreseeability.",
  };
  const interp_damages: Interpretation = {
    ...stamp(N.interp_damages),
    type: "Interpretation",
    layer: "frame",
    statement:
      "Compensable damages: the plaintiff must have suffered a quantifiable physical, economic, or emotional injury that the law recognizes for recovery.",
    notes:
      "Modern rule. Includes emotional distress where physical injury or special circumstances support it.",
  };
  const interp_damages_alt: Interpretation = {
    ...stamp(N.interp_damages_alt),
    type: "Interpretation",
    layer: "frame",
    statement:
      "Physical-injury-only test: the plaintiff must have suffered a physical or economic injury; standalone emotional distress without physical impact is not compensable.",
    notes:
      "Older 'impact rule' / 'zone of danger' restrictions on emotional-distress recovery. More defendant-friendly: excludes pure emotional injury and bystander claims.",
  };

  // Each Checkpoint routes "yes" → "this element is met" → keeps the AND
  // Gate alive; "no" → "this element fails" → eventually routes to the
  // Not-Liable Conclusion. We give Cardozo's Duty Checkpoint extra prose
  // because it's the dispositive one in this preloaded session.
  // Checkpoints fund the AND Gate. A "yes" answer on any single element does
  // NOT directly conclude liability — it just satisfies one input of the
  // gate. Only when all four "yes" answers land does the gate fire and
  // liability follow. "No" on any element short-circuits straight to the
  // Not-Liable conclusion (one missing element kills the claim).
  const cp_duty: Checkpoint = {
    ...stamp(N.cp_duty),
    type: "Checkpoint",
    layer: "frame",
    question:
      "Under the Cardozo zone-of-danger test: was Mrs. Palsgraf within the foreseeable zone of physical danger created by the railroad employees' conduct?",
    answer_type: "boolean",
    options: [
      {
        id: CP_OPTS.duty.yes,
        label: "Yes — she was within the foreseeable zone",
        target_node_id: remap(N.and_gate),
        satisfies: true,
      },
      {
        id: CP_OPTS.duty.no,
        label: "No — she was outside the foreseeable zone",
        target_node_id: remap(N.not_liable),
        satisfies: false,
      },
    ],
    requires_premise: true,
    requires_authority: false,
  };
  const cp_breach: Checkpoint = {
    ...stamp(N.cp_breach),
    type: "Checkpoint",
    layer: "frame",
    question:
      "Did the railroad employees' conduct (helping a passenger board while he carried an unmarked package) fall below the standard of a reasonable carrier?",
    answer_type: "boolean",
    options: [
      {
        id: CP_OPTS.breach.yes,
        label: "Yes — conduct was unreasonable",
        target_node_id: remap(N.and_gate),
        satisfies: true,
      },
      {
        id: CP_OPTS.breach.no,
        label: "No — conduct was reasonable",
        target_node_id: remap(N.not_liable),
        satisfies: false,
      },
    ],
    requires_premise: true,
    requires_authority: false,
  };
  const cp_causation: Checkpoint = {
    ...stamp(N.cp_causation),
    type: "Checkpoint",
    layer: "frame",
    question:
      "Was the railroad's conduct the proximate cause of Mrs. Palsgraf's injury — both but-for cause AND the chain of consequences foreseeable?",
    answer_type: "boolean",
    options: [
      {
        id: CP_OPTS.causation.yes,
        label: "Yes — proximate causation established",
        target_node_id: remap(N.and_gate),
        satisfies: true,
      },
      {
        id: CP_OPTS.causation.no,
        label: "No — causation broken or remote",
        target_node_id: remap(N.not_liable),
        satisfies: false,
      },
    ],
    requires_premise: true,
    requires_authority: false,
  };
  const cp_damages: Checkpoint = {
    ...stamp(N.cp_damages),
    type: "Checkpoint",
    layer: "frame",
    question:
      "Did Mrs. Palsgraf sustain a quantifiable, legally compensable injury?",
    answer_type: "boolean",
    options: [
      {
        id: CP_OPTS.damages.yes,
        label: "Yes — quantifiable injury established",
        target_node_id: remap(N.and_gate),
        satisfies: true,
      },
      {
        id: CP_OPTS.damages.no,
        label: "No — no compensable damages",
        target_node_id: remap(N.not_liable),
        satisfies: false,
      },
    ],
    requires_premise: true,
    requires_authority: false,
  };

  const conclusion_liable: Conclusion = {
    ...stamp(N.liable),
    type: "Conclusion",
    layer: "frame",
    statement:
      "The railroad is liable to Mrs. Palsgraf for negligence — duty owed, breach, proximate causation, and damages all met.",
    direction: { kind: "legal", value: "favors_plaintiff" },
    reasoning_summary:
      "All four elements (duty, breach, causation, damages) satisfied; AND Gate fires; liability follows.",
  };
  const conclusion_not_liable: Conclusion = {
    ...stamp(N.not_liable),
    type: "Conclusion",
    layer: "frame",
    statement:
      "The railroad is not liable to Mrs. Palsgraf — at least one element of negligence failed.",
    direction: { kind: "legal", value: "favors_defendant" },
    reasoning_summary:
      "AND Gate cannot fire if any of duty / breach / causation / damages fails. Under Cardozo, duty fails because Mrs. Palsgraf was outside the foreseeable zone of danger.",
  };

  const authority: Authority = {
    ...stamp(N.authority),
    type: "Authority",
    layer: "frame",
    citation: "Palsgraf v. Long Island R.R., 248 N.Y. 339 (1928)",
    court: "New York Court of Appeals",
    year: 1928,
    is_holding: true,
    is_binding: false,
    holding_summary:
      "A defendant's duty of care runs only to plaintiffs within the foreseeable zone of physical danger created by the defendant's conduct.",
  };

  const nodes: Node[] = [
    root,
    and_gate,
    sq_duty,
    sq_breach,
    sq_causation,
    sq_damages,
    term_duty,
    term_breach,
    term_causation,
    term_damages,
    interp_cardozo,
    interp_andrews,
    interp_breach,
    interp_breach_alt,
    interp_causation,
    interp_causation_alt,
    interp_damages,
    interp_damages_alt,
    cp_duty,
    cp_breach,
    cp_causation,
    cp_damages,
    conclusion_liable,
    conclusion_not_liable,
    authority,
  ];

  function edge(type: Edge["type"], source: NodeRef, target: NodeRef): Edge {
    return {
      id: generateId(),
      type,
      layer: "frame",
      source,
      target,
      created_at: now,
      updated_at: now,
    } as Edge;
  }

  // ---------------------------------------------------------------------------
  // Edges
  // ---------------------------------------------------------------------------
  //
  // Structural reachability:
  //   RQ -DECOMPOSES_INTO-> each SubQuestion
  //   each SubQuestion -TURNS_ON-> its Term
  //   each Term -INTERPRETED_AS-> its Interpretation(s)
  //   each Interpretation -LEADS_TO-> its Checkpoint
  //   Cardozo -LEADS_TO-> NotLiable (the dispositive "out of zone" route)
  //   each Checkpoint's "yes" routing -LEADS_TO-> Liable AND its "no" -> NotLiable
  //   AndGate -GATES-> Liable (the gate's output)
  //   Authority -CITES-> Cardozo
  const edges: Edge[] = [
    // Root decomposition into four elements
    edge("DECOMPOSES_INTO", remap(N.rq), remap(N.sq_duty)),
    edge("DECOMPOSES_INTO", remap(N.rq), remap(N.sq_breach)),
    edge("DECOMPOSES_INTO", remap(N.rq), remap(N.sq_causation)),
    edge("DECOMPOSES_INTO", remap(N.rq), remap(N.sq_damages)),
    // Each SubQuestion -> its Term (the contested concept inside the element)
    edge("TURNS_ON", remap(N.sq_duty), remap(N.term_duty)),
    edge("TURNS_ON", remap(N.sq_breach), remap(N.term_breach)),
    edge("TURNS_ON", remap(N.sq_causation), remap(N.term_causation)),
    edge("TURNS_ON", remap(N.sq_damages), remap(N.term_damages)),
    // Each element's primary Interpretation also routes into the AND Gate.
    // Pedagogically: the chosen reading of every element is what the gate
    // combines. The schema allows LEADS_TO only from Interpretation or
    // LogicalGate (not SubQuestion), so we wire the gate from the leaf
    // Interpretations rather than the SubQuestions directly.
    edge("LEADS_TO", remap(N.interp_cardozo), remap(N.and_gate)),
    edge("LEADS_TO", remap(N.interp_breach), remap(N.and_gate)),
    edge("LEADS_TO", remap(N.interp_causation), remap(N.and_gate)),
    edge("LEADS_TO", remap(N.interp_damages), remap(N.and_gate)),
    // Each Term offers two competing Interpretations. The session selects
    // one per Term; the other dims as an unselected alternative reading.
    edge("INTERPRETED_AS", remap(N.term_duty), remap(N.interp_cardozo)),
    edge("INTERPRETED_AS", remap(N.term_duty), remap(N.interp_andrews)),
    edge("INTERPRETED_AS", remap(N.term_breach), remap(N.interp_breach)),
    edge("INTERPRETED_AS", remap(N.term_breach), remap(N.interp_breach_alt)),
    edge("INTERPRETED_AS", remap(N.term_causation), remap(N.interp_causation)),
    edge("INTERPRETED_AS", remap(N.term_causation), remap(N.interp_causation_alt)),
    edge("INTERPRETED_AS", remap(N.term_damages), remap(N.interp_damages)),
    edge("INTERPRETED_AS", remap(N.term_damages), remap(N.interp_damages_alt)),
    // Each Interpretation routes into its element's fact-Checkpoint. Both
    // the primary and the alt-reading lead to the same Checkpoint — the
    // question changes shape based on which reading you select, but the
    // structural target is the same fact decision point.
    edge("LEADS_TO", remap(N.interp_cardozo), remap(N.cp_duty)),
    edge("LEADS_TO", remap(N.interp_breach), remap(N.cp_breach)),
    edge("LEADS_TO", remap(N.interp_breach_alt), remap(N.cp_breach)),
    edge("LEADS_TO", remap(N.interp_causation), remap(N.cp_causation)),
    edge("LEADS_TO", remap(N.interp_causation_alt), remap(N.cp_causation)),
    edge("LEADS_TO", remap(N.interp_damages), remap(N.cp_damages)),
    edge("LEADS_TO", remap(N.interp_damages_alt), remap(N.cp_damages)),
    // Andrews short-circuits Duty: under its broad reading, duty is owed
    // to everyone, so the Duty element collapses straight into the Liable
    // conclusion (the other three elements still must hold via the gate).
    edge("LEADS_TO", remap(N.interp_andrews), remap(N.liable)),
    // Cardozo's "out of zone" path also exposes a direct route to the
    // Not-Liable conclusion — when duty fails the analysis ends there,
    // even before the gate is reached. This is what the preloaded session
    // demonstrates.
    edge("LEADS_TO", remap(N.interp_cardozo), remap(N.not_liable)),
    // AND Gate produces the Liable Conclusion when (and only when) all
    // four element inputs are satisfied.
    edge("GATES", remap(N.and_gate), remap(N.liable)),
    // Authority cites Cardozo's interpretation — Palsgraf v. Long Island
    // R.R., 248 N.Y. 339 (1928), is the case that adopted the zone test.
    edge("CITES", remap(N.authority), remap(N.interp_cardozo)),
  ];

  const frame_id = generateId();
  const frame_version_id = generateId();

  const frame_version: FrameVersion = {
    id: frame_version_id,
    frame_id,
    version_number: 1,
    created_at: now,
    created_by: user_id,
    change_summary: "Tutorial frame: complete Palsgraf negligence",
    is_milestone: true,
    nodes,
    edges,
  };

  const frame: Frame = {
    id: frame_id,
    title: TUTORIAL_TITLE,
    description: TUTORIAL_DESCRIPTION,
    mode: "legal",
    default_satisfaction_policies: {},
    tags: ["tutorial"],
    pinned: false,
    created_at: now,
    updated_at: now,
    current_version_id: frame_version_id,
  };

  // ---------------------------------------------------------------------------
  // Session: full set of premises + selections covering all four elements
  // ---------------------------------------------------------------------------

  function premise(statement: string, kind: Premise["kind"]): Premise {
    return {
      id: generateId(),
      type: "Premise",
      layer: "argument",
      statement,
      kind,
      created_at: now,
      updated_at: now,
    };
  }

  // Duty: stipulated that Mrs. Palsgraf was OUTSIDE the zone of danger
  // (Cardozo's dispositive fact). This answers the Duty Checkpoint "No".
  const premise_duty = premise(
    "Mrs. Palsgraf was standing on the platform at the far end of the station, beyond any foreseeable physical reach of the fireworks the railroad employee dislodged.",
    "stipulated",
  );
  // Breach: stipulated that the conduct WAS unreasonable. This answers
  // the Breach Checkpoint "Yes" — included so the user can see that even
  // a strong breach showing doesn't save the claim once Duty fails.
  const premise_breach = premise(
    "The railroad employee yanked the passenger holding the unmarked package without verifying its contents — a careful carrier would have refused to push him.",
    "stipulated",
  );
  // Causation: stipulated that the chain of causation was unbroken.
  const premise_causation = premise(
    "The dropped package caused the explosion which caused the scales to fall on Mrs. Palsgraf — a continuous physical sequence, no intervening cause.",
    "stipulated",
  );
  // Damages: stipulated that Mrs. Palsgraf was injured.
  const premise_damages = premise(
    "Mrs. Palsgraf suffered head and nervous-system injuries requiring medical care and lost wages.",
    "stipulated",
  );

  function answersEdge(premise_id: NodeRef, target_checkpoint: NodeRef): Edge {
    return {
      id: generateId(),
      type: "ANSWERS",
      layer: "argument",
      source: premise_id,
      target: target_checkpoint,
      created_at: now,
      updated_at: now,
    } as Edge;
  }

  const argument_edges: Edge[] = [
    answersEdge(premise_duty.id, remap(N.cp_duty)),
    answersEdge(premise_breach.id, remap(N.cp_breach)),
    answersEdge(premise_causation.id, remap(N.cp_causation)),
    answersEdge(premise_damages.id, remap(N.cp_damages)),
  ];

  // Only the Duty Term has competing Interpretations to choose between.
  const interpretation_selections: InterpretationSelection[] = [
    {
      term_id: remap(N.term_duty),
      selected_interpretation_ids: [remap(N.interp_cardozo)],
      supporting_authority_id: remap(N.authority),
      notes:
        "Selecting Cardozo's narrow zone-of-danger rule, the majority opinion. The alternative (Andrews) would short-circuit by treating the duty question as moot in favor of a proximate-cause analysis.",
      selected_at: now,
    },
    {
      term_id: remap(N.term_breach),
      selected_interpretation_ids: [remap(N.interp_breach)],
      selected_at: now,
    },
    {
      term_id: remap(N.term_causation),
      selected_interpretation_ids: [remap(N.interp_causation)],
      selected_at: now,
    },
    {
      term_id: remap(N.term_damages),
      selected_interpretation_ids: [remap(N.interp_damages)],
      selected_at: now,
    },
  ];

  const checkpoint_responses: CheckpointResponse[] = [
    {
      checkpoint_id: remap(N.cp_duty),
      selected_option_id: CP_OPTS.duty.no,
      premise_id: premise_duty.id,
      answered_at: now,
      notes:
        "Mrs. Palsgraf was outside the foreseeable zone of danger; under Cardozo, no duty is owed and the negligence claim fails at element 1.",
    },
    {
      checkpoint_id: remap(N.cp_breach),
      selected_option_id: CP_OPTS.breach.yes,
      premise_id: premise_breach.id,
      answered_at: now,
      notes:
        "The employees' conduct fell below the standard of a reasonable carrier — but this becomes moot once Duty fails.",
    },
    {
      checkpoint_id: remap(N.cp_causation),
      selected_option_id: CP_OPTS.causation.yes,
      premise_id: premise_causation.id,
      answered_at: now,
      notes: "Causation is unbroken on the stipulated facts — moot under Cardozo.",
    },
    {
      checkpoint_id: remap(N.cp_damages),
      selected_option_id: CP_OPTS.damages.yes,
      premise_id: premise_damages.id,
      answered_at: now,
      notes: "Mrs. Palsgraf was clearly injured — moot under Cardozo.",
    },
  ];

  const session_id = generateId();
  const session_version_id = generateId();

  const all_premises: Premise[] = [
    premise_duty,
    premise_breach,
    premise_causation,
    premise_damages,
  ];

  const session_version: ArgumentSessionVersion = {
    id: session_version_id,
    session_id,
    version_number: 1,
    created_at: now,
    created_by: user_id,
    change_summary:
      "Tutorial session: Cardozo + all four elements stipulated. Duty fails (out of zone); the AND Gate cannot fire; resolved Not Liable.",
    premises: all_premises,
    argument_edges,
    checkpoint_responses,
    interpretation_selections,
    is_milestone: true,
  };

  const session: ArgumentSession = {
    id: session_id,
    frame_id,
    frame_version_id,
    frame_version_snapshot: frame_version,
    title: TUTORIAL_SESSION_TITLE,
    description:
      "Walks all four elements of negligence with the Cardozo interpretation selected. Duty fails (out of zone); the AND Gate fails; Not Liable.",
    premises: all_premises,
    argument_edges,
    checkpoint_responses,
    interpretation_selections,
    status_map: {},
    created_at: now,
    updated_at: now,
    current_version_id: session_version_id,
  };

  const role_to_id: TutorialRoleMap = {
    rq: remap(N.rq),
    and_gate: remap(N.and_gate),
    sq_duty: remap(N.sq_duty),
    sq_breach: remap(N.sq_breach),
    sq_causation: remap(N.sq_causation),
    sq_damages: remap(N.sq_damages),
    term_duty: remap(N.term_duty),
    term_breach: remap(N.term_breach),
    term_causation: remap(N.term_causation),
    term_damages: remap(N.term_damages),
    interp_cardozo: remap(N.interp_cardozo),
    interp_andrews: remap(N.interp_andrews),
    interp_breach: remap(N.interp_breach),
    interp_breach_alt: remap(N.interp_breach_alt),
    interp_causation: remap(N.interp_causation),
    interp_causation_alt: remap(N.interp_causation_alt),
    interp_damages: remap(N.interp_damages),
    interp_damages_alt: remap(N.interp_damages_alt),
    cp_duty: remap(N.cp_duty),
    cp_breach: remap(N.cp_breach),
    cp_causation: remap(N.cp_causation),
    cp_damages: remap(N.cp_damages),
    liable: remap(N.liable),
    not_liable: remap(N.not_liable),
    authority: remap(N.authority),
  };

  return { frame, frame_version, session, session_version, role_to_id };
}
