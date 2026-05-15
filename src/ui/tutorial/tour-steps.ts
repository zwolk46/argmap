/**
 * react-joyride step definitions for the tutorial. Two phases:
 *
 *   short — five steps. The "you-just-saw-it-work" overview.
 *   long  — twelve+ steps. Walks the complete four-element negligence
 *           example node by node and explains how the AND Gate enforces
 *           the all-of-four rule.
 *
 * Anchor strategy: anchors target `data-testid` for high-level surfaces or
 * `data-id` for individual nodes. If a target is missing at runtime joyride
 * renders the step centered on screen with no arrow, so the narrative still
 * lands even when an anchor is gone.
 */
import type { Step } from "react-joyride";
import type { TutorialRoleMap, TutorialNodeRole } from "@/tutorial";

function nodeTarget(id: string): string {
  return `[data-id="${id.replace(/"/g, '\\"')}"]`;
}

export function buildShortTourSteps(_roles: TutorialRoleMap | null): Step[] {
  return [
    {
      target: "body",
      placement: "center",
      title: "Welcome — see how a complete negligence claim resolves",
      content:
        "This is a worked example of Palsgraf v. Long Island Railroad. The frame in front of you models the full negligence claim — DUTY, BREACH, CAUSATION, and DAMAGES — joined by an AND Gate that requires all four to hold. The session we've preloaded selects Cardozo's narrow duty rule and stipulates Mrs. Palsgraf was outside the zone of danger, so the Duty element fails, the AND Gate fails, and the resolved output is NOT LIABLE — even though the other three elements are stipulated met.",
      disableBeacon: true,
      spotlightClicks: false,
    },
    {
      target: '[data-testid="frame-canvas"]',
      placement: "auto",
      title: "The map of the argument",
      content:
        "Every box is a step in the legal reasoning. The colored 'primary path' shows the route the runtime took to its conclusion. Nodes off the path are dimmed — they were either short-circuited by the failing AND Gate or weren't visited because their branch wasn't selected.",
    },
    {
      target: '[data-testid="output-viewer"]',
      placement: "auto",
      title: "What the runtime concluded",
      content:
        "The runtime walked the frame using your premises and selections, evaluated every element, applied the AND Gate, and produced a resolved output. For this tutorial: determinate, NOT LIABLE — because the Duty element fails the moment we select Cardozo and stipulate Mrs. Palsgraf was outside the zone.",
    },
    {
      target: '[data-testid="interview-pane"]',
      placement: "auto",
      title: "The to-do list of every open question",
      content:
        "The Interview pane shows everything that still needs an answer. In this finished tutorial there's nothing open — every Checkpoint has a Premise behind it. In your own sessions this is where the runtime tells you what would unblock the next step.",
    },
    {
      target: "body",
      placement: "center",
      title: "That's the short tour",
      content:
        "You've seen the whole pipeline: a frame, a set of premises, and a resolved primary path. Want the longer walkthrough that explains how the AND Gate combines all four negligence elements, how the Cardozo / Andrews split works, and exactly how each Premise drives the conclusion?",
    },
  ];
}

export function buildLongTourSteps(roles: TutorialRoleMap | null): Step[] {
  const at = (role: TutorialNodeRole): string =>
    roles ? nodeTarget(roles[role]) : '[data-testid="frame-canvas"]';

  return [
    {
      target: "body",
      placement: "center",
      title: "The complete negligence walkthrough",
      content:
        "Negligence has four elements — DUTY, BREACH, CAUSATION, DAMAGES — and a defendant is liable only when all four are met. The tour walks each element, then the AND Gate that combines them, then traces the path the runtime followed under your selections.",
      disableBeacon: true,
    },
    {
      target: '[data-testid="frame-canvas"]',
      placement: "auto",
      title: "Two concepts: the Frame and the Session",
      content:
        "The graph in front of you is the FRAME — the logical structure of the legal question. It's reusable: every argument session on this frame uses the same nodes and edges. A SESSION is the FACTS you bring in (premises + interpretation choices + checkpoint answers). The frame is the skeleton; the session is the flesh. You're looking at one Session on top of the Palsgraf frame.",
    },
    {
      target: at("rq"),
      placement: "auto",
      title: "Root Question — the legal question",
      content:
        "Every frame answers exactly one Root Question. Here: 'Is the railroad liable to Mrs. Palsgraf for negligence?' All the structure below this exists to support a determinate Yes or No answer.",
    },
    {
      target: at("and_gate"),
      placement: "auto",
      title: "AND Gate — every element must hold",
      content:
        "Negligence requires DUTY, BREACH, CAUSATION, and DAMAGES. The AND Gate enforces 'all of the above': it has four inputs (one per element). The gate's output (the 'Liable' Conclusion) fires only if every input is satisfied. If any one element fails — even with the other three rock-solid — the gate fails and liability does not follow. This is exactly what happens under Cardozo: Duty fails, gate fails, NOT LIABLE.",
    },
    {
      target: at("sq_duty"),
      placement: "auto",
      title: "Element 1: Duty",
      content:
        "The first sub-question: did the railroad owe Mrs. Palsgraf a duty of care? This is the contested element in Palsgraf — the case turns entirely on it. Cardozo and Andrews split here.",
    },
    {
      target: at("term_duty"),
      placement: "auto",
      title: "Term — the contested concept",
      content:
        "'Scope of duty' is the legal Term that the Duty question turns on. A Term doesn't resolve anything by itself; what matters is which Interpretation you pick for it.",
    },
    {
      target: at("interp_cardozo"),
      placement: "auto",
      title: "Cardozo's interpretation (majority — the narrow rule)",
      content:
        "Cardozo: duty extends only to plaintiffs in the foreseeable zone of physical danger. If the plaintiff was outside that zone, no duty was owed, period — the analysis ends. The session selected this interpretation (you'll see it highlighted) and that's why the path runs through it.",
    },
    {
      target: at("interp_andrews"),
      placement: "auto",
      title: "Andrews's interpretation (dissent — the broad rule)",
      content:
        "Andrews: every actor owes a duty to the world. Liability is bounded later, by proximate cause, not by the duty question. Currently dimmed because the session selected Cardozo. If you swap to Andrews, this becomes the active branch and Duty is automatically satisfied — making BREACH, CAUSATION, DAMAGES the dispositive questions.",
    },
    {
      target: at("cp_duty"),
      placement: "auto",
      title: "Duty Checkpoint — the dispositive fact question",
      content:
        "Under Cardozo, the Checkpoint asks: 'Was Mrs. Palsgraf within the foreseeable zone of danger?' Your stipulated Premise answered 'No', which routes the Duty element straight to the NOT-LIABLE Conclusion — bypassing the gate, because a single missing element kills the claim. Each Checkpoint has two `target_node_id`s: 'Yes' funnels into the AND Gate (where it joins the other three elements); 'No' short-circuits direct to Not Liable. That's how the four-elements-required rule is enforced structurally, not just by narrative.",
    },
    {
      target: at("sq_breach"),
      placement: "auto",
      title: "Element 2: Breach (would have been met)",
      content:
        "Did the railroad fall below the standard of a reasonable carrier? The session's stipulated Premise answered the Breach Checkpoint 'Yes' — but it doesn't matter for THIS session because the Duty element already failed. The AND Gate fails on any single missing element. We modeled it anyway so you can see the runtime evaluates EVERY element, not just the one that breaks first.",
    },
    {
      target: at("sq_causation"),
      placement: "auto",
      title: "Element 3: Causation (would have been met)",
      content:
        "Was the railroad's conduct the proximate cause of injury — but-for cause AND foreseeable in its chain of consequences? Stipulated 'Yes' here. Same caveat: moot for this session because Duty already failed.",
    },
    {
      target: at("sq_damages"),
      placement: "auto",
      title: "Element 4: Damages (would have been met)",
      content:
        "Did Mrs. Palsgraf sustain a quantifiable, legally compensable injury? Stipulated 'Yes' (she was injured by the falling scales). Moot for this session — but the runtime evaluates it anyway so you can see all four element results side-by-side.",
    },
    {
      target: at("authority"),
      placement: "auto",
      title: "Authority — what backs the Cardozo rule",
      content:
        "This is the actual Palsgraf v. Long Island R.R., 248 N.Y. 339 (1928) case. In Legal mode, authorities carry court / year / binding-vs-persuasive flags. The runtime can prefer paths backed by binding authority when there's a tie between Conclusions — making your reasoning auditable, not arbitrary.",
    },
    {
      target: '[data-testid="bottom-panel-expanded"], [data-testid="bottom-panel-collapsed"]',
      placement: "auto",
      title: "Premises — the evidence you bring in",
      content:
        "The Bottom Panel shows the premises this session brings in — one per element here. Each Premise has an ANSWERS edge to a Checkpoint. In your own sessions you'd accumulate dozens of premises and they can also SUPPORT or CONTRADICT Interpretations and Conclusions, not just answer Checkpoints.",
    },
    {
      target: '[data-testid="frame-canvas"]',
      placement: "auto",
      title: "How the path got selected — read it in order",
      content:
        "The highlighted edges trace the route the runtime followed. Top-down: Root Question → Duty Sub-Question → 'Scope of duty' Term → Cardozo Interpretation → Duty Checkpoint → 'No' option → Not Liable. The other three elements (Breach, Causation, Damages) each route 'Yes' into the AND Gate — but the gate refuses to fire because Duty isn't satisfied. Change ANY input (a different Interpretation, a different Checkpoint answer, a different Premise) and the path reroutes — sometimes flipping the outcome entirely.",
    },
    {
      target: '[data-testid="output-viewer"]',
      placement: "auto",
      title: "Reproducible — same inputs, same answer",
      content:
        "It's deterministic: the same frame plus the same session always produce the same path. If two paths tie (e.g., one Conclusion has multiple supporting routes), the runtime prefers binding authority over persuasive, then the most-deeply-resolved branch — a stable rule, not a coin flip. The Logical Gate types (AND / OR / NOT / IF-THEN / UNLESS) let you express anything Boolean — the AND in this frame is the typical 'all elements required'; OR would express alternatives, NOT a negation, IF-THEN a conditional rule, UNLESS an exception.",
    },
    {
      target: "body",
      placement: "center",
      title: "Ready to build your own?",
      content:
        "Hit 'Home' in the top bar, click 'New frame', and start with your own Root Question. The Frame Building view lets you drag nodes from the left palette, connect them with edges, and edit each node's content. When you're ready to test premises against your frame, run an Argument Session — exactly like this tutorial.",
    },
  ];
}
