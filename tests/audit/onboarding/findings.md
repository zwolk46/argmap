# Onboarding audit findings

- A-OK: app_state_store.resetCoachmarks() exists and was invoked from test harness.
- A-NOTE: wizard does NOT auto-launch; opened via 'New frame' Home button (returning user / known account).
- A-OK: wizard Cancel did not create a frame.
- A-FINDING (B): wizard has no jurisdiction step for Legal mode (spec mentions it, but new-frame-wizard.tsx ships only Mode/Flavor/Details).
- A-FINDING (B): wizard has no template-pick step (deferred to v1.5 per new-frame-wizard.tsx comment).
- A-OK: wizard Legal mode created a frame and routed to frame-building.
- A-OK: wizard General + Academic flavor flow completed.
- A-NOTE: after reset, coachmark_dismissals = {} (expected empty).
- A-FINDING (B): no [data-testid="coachmark"] rendered after reset+nav. useCoachmark / <Coachmark> are exported but never mounted in any pane (verified by grep across src/ui — only registry + hook exist). The spec's coachmark anchors (options_box, Term linked-to, switch-to-argument, premise-kind, interpretation-direction) are NOT wired in this build.
- A-FINDING (B): no [data-glossary-term] / glossary-anchored elements found in current view; GlossaryTooltip is shipped but may not be applied to inspector / node-card surfaces yet. Hover-tooltip behavior unverifiable via UI in current build.
- A-OK: Help pane shows 'Onboarding' section with Reset coachmarks.
- A-OK: Reset coachmarks clicked. Before={"welcome_screen":true}, After={}.
- A-OK: react-joyride tutorial tooltip rendered after launching tutorial.
- A-OK: tutorial Skip button is available (opt-out path).
