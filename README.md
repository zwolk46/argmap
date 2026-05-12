# argmap (zwolk)

Web-based argument mapping application. Primary use case: legal analysis
(appellate opinions, statutory interpretation, trial preparation). Secondary:
general analytical discourse — academic argument mapping and analytical
personal questions of an academic flavor.

The application separates the LOGICAL FRAME of an argument from the PREMISES
used to make it sound. A Legal Mode toggle activates jurisdiction- and
authority-aware features specific to law.

## Repo state

Pre-coding planning complete for Streams A–H. Stream I (the "build kit")
design phase complete (I.1–I.10). Coding phase in progress:

- I.1 skeleton + I.2 schema: complete (this session).
- I.3 runtime, I.4 persistence, I.5 state, I.6 modes, I.7 layout, I.8 llm-hooks,
  I.9 ui sub-modules, I.10 Home page + integration tests + E2E: pending.

## Running

```bash
npm install
npm run dev            # http://localhost:5173 — placeholder page
npm run ci             # typecheck + lint + format + unit tests + plugin self-test + iteration audit
npm run test:e2e       # Playwright smoke (requires app built or dev server running)
```

## Layout

```
src/schema/      — types, validators, JSON envelope, migrations (this session, I.2)
src/runtime/     — placeholder; I.3 implements the compute pipeline. iteration-helpers ship now.
src/persistence/ — placeholder; I.4
src/state/       — placeholder; I.5
src/modes/       — placeholder; I.6
src/layout/      — placeholder; I.7
src/llm-hooks/   — placeholder; I.8
src/ui/          — placeholder; I.9a–I.9d4 + I.10
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
