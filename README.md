# argmap (zwolk)

Web-based argument mapping application. Primary use case: legal analysis
(appellate opinions, statutory interpretation, trial preparation). Secondary:
general analytical discourse — academic argument mapping and analytical
personal questions of an academic flavor.

The application separates the LOGICAL FRAME of an argument from the PREMISES
used to make it sound. A Legal Mode toggle activates jurisdiction- and
authority-aware features specific to law.

## Repo state

All Stream I coding modules (I.1 skeleton through I.10 Home page + integration)
are implemented and exercised by the test suite. The application boots, signs
users in, lets them create frames, build them in Frame Building, and run
argument sessions against them in Argument Running. Persistence is Supabase
(Postgres) via the `src/persistence/` layer. Deployments are on Vercel.

## Running

```bash
npm install
npm run dev            # http://localhost:5173 — sign-in screen, then the app
npm run ci             # typecheck + lint + format + unit tests + plugin self-test + iteration audit
npm run test:e2e       # Playwright smoke (requires app built or dev server running)
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` to point
at a Supabase project — the boot screen will surface a fail-fast banner if
they're missing.

## Layout

```
src/schema/      — types, validators, JSON envelope, migrations (I.2)
src/runtime/     — pure compute pipeline for the determinism guarantee (I.3)
src/persistence/ — Supabase repository + autosave + cross-tab broadcast (I.4)
src/state/       — Zustand stores wrapping the runtime (I.5)
src/modes/       — mode/flavor transition orchestration (I.6)
src/layout/      — ELK layout planning + xyflow integration (I.7)
src/llm-hooks/   — G1..G13 LLM hook orchestration (I.8)
src/ui/          — UI surfaces: chrome, frame-building, argument-running, etc. (I.9)
src/ui/home/     — Home / sign-in / app-routes integration (I.10)
```

## Working in this repo

Every Claude Code session auto-loads `.claude/CLAUDE.md`, which contains the
full Constitution and Protocol governing this project. The session lifecycle
(onboarding → work → self-review → persistence → handoff) is defined in
Article VIII of the Protocol.

Authoritative current project state: `docs/current_state.html`.
Append-only flag register: `docs/flags.html`.

## Determinism gates (Article II § 2)

- ESLint `no-restricted-imports` boundary on `src/runtime/`.
- `eslint-plugin-argmap-determinism/no-unsorted-iteration` (workspace package).
- Frozen-clock Vitest at `2026-05-10T00:00:00Z`.
- Per-PR `scripts/audit-iteration-order.mjs` belt-and-braces audit.
- F-028 snapshot: `FrameVersion` carries `mode`, `flavor`,
  `default_satisfaction_policies`, and `jurisdiction_default` so the runtime
  computes purely from `FrameVersion + ArgumentSession` without inference.
- LLM hooks pinned to `claude-3-7-sonnet-20250219` with `temperature: 0`
  (`src/llm-hooks/providers/anthropic.ts`).
