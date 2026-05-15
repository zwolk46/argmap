/**
 * TutorialTour — react-joyride wrapper that drives the short and long
 * tutorial walkthroughs. Mounted near the top of ArgumentRunningPage so it
 * can anchor on canvas / interview / output / bottom-panel test ids.
 *
 * Flow:
 *   1. Home → "Try the tutorial" sets phase = "short" and navigates here.
 *   2. This component reads the phase via subscribeTutorialPhase and runs
 *      the matching steps.
 *   3. When the short tour ends (last step = step index N-1), we present a
 *      Continue / Dismiss prompt. Continue sets phase = "long". Dismiss
 *      sets phase = "done".
 *   4. When the long tour ends (or the user clicks Skip), phase = "done"
 *      and the component unmounts.
 *
 * The component renders nothing when phase is null/done — pure passthrough.
 */
import * as React from "react";
import type { ReactElement } from "react";
import Joyride, { STATUS, type CallBackProps, type Step } from "react-joyride";
import { Dialog, Button } from "../primitives";
import { readTutorialRoleMap, clearTutorialRoleMap } from "@/tutorial";
import {
  getTutorialPhase,
  setTutorialPhase,
  subscribeTutorialPhase,
  type TutorialPhase,
} from "./tutorial-phase";
import { buildShortTourSteps, buildLongTourSteps } from "./tour-steps";

function useTutorialPhase(): TutorialPhase | null {
  const [phase, setPhase] = React.useState<TutorialPhase | null>(() => getTutorialPhase());
  React.useEffect(() => {
    return subscribeTutorialPhase(setPhase);
  }, []);
  return phase;
}

export function TutorialTour(): ReactElement | null {
  const phase = useTutorialPhase();
  // After the short tour finishes, prompt the user to continue to the long
  // tour or dismiss. We capture this as separate React state so the prompt
  // dialog persists across joyride lifecycle events.
  const [show_continue_prompt, setShowContinuePrompt] = React.useState(false);

  if (phase === null || phase === "done") {
    // Still need to render the continue prompt if it's open.
    if (!show_continue_prompt) return null;
  }

  // Compute steps fresh per phase. Role map is read from sessionStorage so
  // tour steps can target specific Palsgraf-tutorial nodes by data-id. If
  // the map is missing (cleared between tour launches), steps gracefully
  // fall back to the canvas-level anchor.
  const roles = readTutorialRoleMap();
  const steps: Step[] | null =
    phase === "short"
      ? buildShortTourSteps(roles)
      : phase === "long"
        ? buildLongTourSteps(roles)
        : null;

  function handleCallback(data: CallBackProps): void {
    const { status, action } = data;
    const finished: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (!finished.includes(status)) return;

    // Reaching the end of the short tour: show the continue/dismiss prompt
    // instead of immediately setting "done". The user picks via the dialog.
    if (phase === "short" && action !== "skip" && status === STATUS.FINISHED) {
      setShowContinuePrompt(true);
      // Clear the current phase so joyride unmounts; the prompt is the gate.
      setTutorialPhase(null);
      return;
    }
    // Any other path (long tour done, user clicked Skip in either tour):
    // mark the tutorial done and free the role-map storage slot so the next
    // tutorial run starts clean.
    setTutorialPhase("done");
    clearTutorialRoleMap();
    setShowContinuePrompt(false);
  }

  return (
    <>
      {steps ? (
        <Joyride
          steps={steps}
          run={true}
          continuous={true}
          showSkipButton={true}
          showProgress={true}
          callback={handleCallback}
          // CRITICAL: tooltips must overlay content without pushing layout.
          // joyride defaults push the page (and try to scroll the spotlight
          // into view) which on a 100vh-overflow:hidden shell forces the
          // user to scroll. These three flags + portal-rendering pin every
          // tooltip to the viewport.
          disableScrolling={true}
          disableOverlayClose={true}
          scrollToFirstStep={false}
          spotlightPadding={6}
          spotlightClicks={false}
          floaterProps={{
            // Render the floater (the tooltip + arrow) into a portal at the
            // document root so it never inherits the parent's overflow
            // clipping or scroll context.
            disableAnimation: false,
            hideArrow: false,
            options: {
              preventOverflow: { boundariesElement: "viewport" },
            },
          }}
          styles={{
            options: {
              primaryColor: "var(--color-mode-current-accent, #1f6feb)",
              zIndex: 10000,
              arrowColor: "var(--color-surface-elevated, #ffffff)",
              backgroundColor: "var(--color-surface-elevated, #ffffff)",
              textColor: "var(--color-text-primary, #111827)",
              overlayColor: "rgba(15, 23, 42, 0.45)",
              width: 380,
            },
            tooltip: {
              borderRadius: "var(--radius-lg, 12px)",
              padding: "var(--space-4, 16px) var(--space-5, 20px)",
              fontSize: "var(--font-size-sm, 13px)",
              lineHeight: "var(--line-height-relaxed, 1.6)",
              boxShadow:
                "0 16px 40px -10px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.04)",
            },
            tooltipContainer: { textAlign: "left" },
            tooltipTitle: {
              fontSize: "var(--font-size-md, 15px)",
              fontWeight: "var(--font-weight-semibold, 600)",
              margin: 0,
              marginBottom: "var(--space-2, 8px)",
              color: "var(--color-text-primary, #111827)",
              letterSpacing: "var(--letter-spacing-tight, -0.01em)",
            },
            tooltipContent: {
              padding: 0,
              color: "var(--color-text-secondary, #4b5563)",
            },
            tooltipFooter: {
              marginTop: "var(--space-4, 16px)",
              alignItems: "center",
            },
            buttonNext: {
              borderRadius: "var(--radius-md, 6px)",
              padding: "var(--space-1) 14px",
              fontSize: "var(--font-size-sm, 13px)",
              fontWeight: "var(--font-weight-medium, 500)",
              outline: "none",
            },
            buttonBack: {
              color: "var(--color-text-secondary, #6b7280)",
              fontSize: "var(--font-size-sm, 13px)",
              marginRight: "var(--space-2, 8px)",
            },
            buttonSkip: {
              color: "var(--color-text-tertiary, #9ca3af)",
              fontSize: "var(--font-size-sm, 13px)",
            },
            buttonClose: { display: "none" },
            spotlight: { borderRadius: "var(--radius-md, 6px)" },
          }}
          locale={{
            back: "Back",
            close: "Close",
            last: phase === "short" ? "Finish" : "Done",
            next: "Next",
            skip: "Skip",
          }}
        />
      ) : null}

      <Dialog
        open={show_continue_prompt}
        onClose={() => {
          setTutorialPhase("done");
          setShowContinuePrompt(false);
        }}
        aria_label="Continue to the full tour?"
        size="sm"
      >
        <div
          style={{
            padding: "var(--space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "var(--font-size-lg)",
              fontWeight: "var(--font-weight-semibold)",
            }}
          >
            Want the full walkthrough?
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-secondary)",
            }}
          >
            The short tour showed the resolved argument and the major panes. The full walkthrough
            explains every node type (Root Question, Sub-Question, Term, Interpretation, Checkpoint,
            Logical Gate, Conclusion, Authority), how premises connect, and how the primary path is
            computed. About 12 steps, takes a few minutes.
          </p>
          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              marginTop: "var(--space-2)",
              justifyContent: "flex-end",
            }}
          >
            <Button
              variant="secondary"
              data-testid="tutorial-dismiss"
              onClick={() => {
                setTutorialPhase("done");
                clearTutorialRoleMap();
                setShowContinuePrompt(false);
              }}
            >
              I've seen enough
            </Button>
            <Button
              variant="primary"
              data-testid="tutorial-continue"
              onClick={() => {
                setShowContinuePrompt(false);
                setTutorialPhase("long");
              }}
            >
              Continue to full tour
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
