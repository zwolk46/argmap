# argmap (zwolk)

Web-based argument mapping application. Primary use case: legal analysis
(appellate opinions, statutory interpretation, trial preparation). Secondary:
general analytical discourse — academic argument mapping and analytical
personal questions of an academic flavor.

The application separates the LOGICAL FRAME of an argument from the PREMISES
used to make it sound. A Legal Mode toggle activates jurisdiction- and
authority-aware features specific to law.

## Repo state

Pre-coding planning complete for Streams A–H (conceptual decisions, schema,
runtime, modes, UI/UX, legal mode, LLM hooks, persistence). Stream I (the
"build kit") in progress:

- I.1 buildkit index + cross-module contracts: complete.
- I.2 schema spec: complete.
- I.3–I.10 (runtime, persistence, state, modes, layout, llm-hooks, ui,
  acceptance specs): pending.

The project skeleton itself has not yet been scaffolded. The first coding
session scaffolds the repo per `docs/stream_i_buildkit_index_v1.html`
"Repo layout the skeleton ships" and "What ships in the I.1 skeleton",
then implements the schema module per `docs/stream_i_schema_spec_v1.html`.

## Working in this repo

Every Claude Code session auto-loads `.claude/CLAUDE.md`, which contains the
full Constitution and Protocol governing this project. The session lifecycle
(onboarding → work → self-review → persistence → handoff) is defined in
Article VIII of the Protocol.

Authoritative current project state: `docs/current_state.html`.
Append-only flag register: `docs/flags.html`.

## Tech stack (Stream H H4)

React + TypeScript + Vite · React Flow (@xyflow/react) · ELK (elkjs) in a
Web Worker · Zustand · Dexie · Vitest + fast-check + Playwright · ESLint
with custom `argmap-determinism/no-unsorted-iteration` rule for the runtime
boundary · Prettier · GitHub Actions CI.
