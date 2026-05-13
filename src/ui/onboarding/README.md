# ui/onboarding

First-time welcome flow, new-frame wizard, coachmark primitive, new-feature-notice
primitive, and onboarding preferences section composed into HelpGlossaryPane.

**Spec:** `docs/stream_i_ui_onboarding_spec_v1.html`.
**Coding session:** I.9d4 (2026-05-12).

## Public API

```typescript
import {
  OnboardingWizard,
  WelcomeScreen,
  NewFrameWizard,
  Coachmark,
  NewFeatureNotice,
  useCoachmark,
  useNewFeatureNotice,
  OnboardingPreferencesSection,
  COACHMARK_IDS,
  COACHMARK_MESSAGES,
  FIRST_LAUNCH_COACHMARK_ID,
  isCoachmarkId,
  type CoachmarkId,
} from "@/ui/onboarding";
```

| Surface                        | Role                                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `OnboardingWizard`             | App-level mount in `app-routes.tsx`. Two stages: welcome → new-frame wizard. Open gated on `selectFirstLaunchDismissed(app_state)`. |
| `WelcomeScreen`                | First stage. Three-section copy + Start + Skip buttons. `WELCOME_SCREEN_COPY` exported for tests.                                   |
| `NewFrameWizard`               | Single-form wizard collecting mode, flavor, title, description. Calls `onSubmit({ title, description?, mode, flavor? })`.           |
| `Coachmark`                    | Anchored popover. Positions via `anchor_ref.current.getBoundingClientRect()`; dismissible via Escape and "Got it" button.           |
| `NewFeatureNotice`             | Static "New" pill notice; dismiss-only.                                                                                             |
| `useCoachmark(id)`             | Returns `{ visible, dismiss, dismiss_on_act, ref }`. Visible iff not in `coachmark_dismissals`.                                     |
| `useNewFeatureNotice(id)`      | Returns `{ visible, dismiss }`. Visible iff not in `seen_new_feature_notices`.                                                      |
| `OnboardingPreferencesSection` | Composed into HelpGlossaryPane. "Reset coachmarks" button clears `coachmark_dismissals` AND undismisses `first_launch` warning.     |
| `COACHMARK_MESSAGES`           | Typed registry of E7-canonical copy keyed by `CoachmarkId`.                                                                         |

## State-layer additions (F-026)

- `AppStateStore.dismissCoachmark(coachmark_id, dismissed?)`: sets the flag in
  `coachmark_dismissals`. New in this session.
- `selectCoachmarkDismissed(app_state, coachmark_id)`: pure selector. New.
- `AppStateStore.resetCoachmarks()`, `markNewFeatureNoticeSeen(id)`,
  `selectFirstLaunchDismissed`, `selectNewFeatureNoticeSeen`,
  `AppStateStore.createFrame({ title, mode?, flavor? })`,
  `Repository.createBlankFrame` — all pre-existing; consumed unchanged.

## Wiring

- `app-routes.tsx` mounts `<OnboardingWizard open={!dismissed} ...>` next to
  `<VersionHistoryPane>`. `onSkip` dispatches `dismissWarning("first_launch")`;
  `onSubmit` calls `app_state_store.createFrame(...)`, dismisses first-launch,
  then navigates to the new frame.
- `help-glossary-pane.tsx` renders `<OnboardingPreferencesSection />` at the
  bottom of the drawer body.
- The placeholder `OnboardingWizard` previously in `pages.tsx` is removed; the
  real export from `@/ui/onboarding` is now re-exported through pages.tsx.

## Scope deferred (per spec § "What this spec does not commit" and budget)

- Five-step wizard split (mode → flavor → jurisdiction → title/desc → template).
  Replaced with a single combined form for v1; the wizard ships the same
  `onSubmit` payload shape, so a future split is purely structural.
- Coachmark anchor inserts at five consuming surfaces (Inspector, NodeFrame
  connector handle, OperatingModeToggle, VersionHistoryPane, InterviewPane).
  The `useCoachmark` hook + `Coachmark` primitive are ready; per-site anchoring
  inserts deferred to a polish pass.
- `WizardStepJurisdiction` (legal-mode picker) + `WizardStepTemplate` (template
  picker). Not load-bearing for v1 because (a) jurisdiction can be edited later
  in frame settings, (b) v1 ships no starter templates.

## Tests

`tests/ui/onboarding/` (12 tests across 3 files): `coachmark-registry`,
`welcome-screen`, `new-frame-wizard`.
