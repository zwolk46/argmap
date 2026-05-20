# UI Overhaul Mapping — Stream I session, 2026-05-20

## Scope

Full UI overhaul of argmap to adopt shadcn/ui primitives + the user's Claude Design preset (`bbVKmki`), excluding nothing — including the React Flow canvas nodes and edges.

The preset only contains theme tokens (palette + font + radius + icon library + style "maia"). No custom designed pages. So the overhaul applies preset *tokens* on top of stock shadcn primitives, then re-skins domain-specific components (status badges, canvas nodes, edge renderers) to the new visual language. The existing semantic data-attribute pattern (`[data-status]`, `[data-kind]`, `[data-variant]`) is preserved.

## Preset contents (bbVKmki)

| Token            | Value                          |
| ---------------- | ------------------------------ |
| style            | `radix-maia` (radix base)      |
| baseColor        | `neutral` (pure gray, chroma 0)|
| theme            | `neutral`                      |
| chartColor       | `neutral`                      |
| iconLibrary      | `phosphor`                     |
| font             | `inter` (`@fontsource-variable/inter`) |
| fontHeading      | `inherit` (same as sans)       |
| radius           | `medium` (0.625rem / 10px)     |
| menuAccent       | `subtle`                       |
| menuColor        | `default`                      |

Buttons in `radix-maia` are pill-shaped (`rounded-4xl`) per the generated reference.

## Base palette swap

Current argmap palette is *warm neutral* (HSL with ~36° hue tint, ~6-16% saturation). The preset is pure achromatic neutral in OKLCH. The user authorized the swap (option 2a).

| Token          | Current (HSL)         | New (OKLCH)               |
| -------------- | --------------------- | ------------------------- |
| canvas         | `hsl(36 16% 97%)`     | `oklch(1 0 0)`            |
| surface pane   | `hsl(36 12% 95%)`     | `oklch(0.985 0 0)`        |
| text primary   | `hsl(30 8% 12%)`      | `oklch(0.145 0 0)`        |
| text secondary | `hsl(30 6% 38%)`      | `oklch(0.556 0 0)`        |
| border default | (warm gray)           | `oklch(0.922 0 0)`        |

Visual effect: slight loss of warmth, more "screen-native" look. Aligns with shadcn's standard neutral aesthetic. Reversible by editing `:root` block in `src/index.css`.

## Domain tokens — PRESERVED unchanged

The following are not in the preset and stay intact:

- **Status palette:** satisfied (green), open (gray), contested (amber), foreclosed (brick-red), not_applicable (desaturated gray)
- **Mode accents:** frame-building (slate-blue), argument-running (burnt sienna)
- **Edge families:** structural (neutral), foreclosure (red), supports (teal), contradicts (orange), answers (purple), annotation (gray)
- **Severity:** pass (= satisfied), warning (= contested), error (saturated red)
- **Legal sub-flags:** binding (navy), persuasive (slate)
- **AI attribution:** plum
- **Milestone star:** warm gold
- **All motion durations:** instant/fast/base/medium/slow/pulse + reduced-motion collapse
- **Z-index scale:** all 11 bands as defined
- **Spacing scale, type scale, line heights, letter spacing**

These are loaded from `src/ui/styles/tokens.css` alongside the new preset tokens. Both coexist in `:root`.

## Icon library swap: UICONS → Phosphor

- Current: UICONS (CDN-hosted, three families: regular-rounded, solid-rounded, bold-rounded)
- New: `@phosphor-icons/react`

Files affected:
- `src/ui/primitives/uicon.tsx` — deprecated, replaced by direct `@phosphor-icons/react` imports
- `src/ui/primitives/type-icon.tsx` — node-type icon mapping moves to Phosphor equivalents
- `src/ui/primitives/severity-icon.tsx` — severity icons move to Phosphor
- `index.html` — drops three UICONS CDN `<link>` tags

Phosphor equivalents:
| UICONS                        | Phosphor                          |
| ----------------------------- | --------------------------------- |
| `fi-rr-interrogation`         | `Question`                        |
| `fi-rr-hashtag`               | `Hash`                            |
| `fi-rr-diamond`               | `Diamond`                         |
| `fi-rr-flag`                  | `Flag`                            |
| `fi-rr-scale`                 | `Scales`                          |
| `fi-rr-chart-tree`            | `TreeStructure`                   |
| `fi-rr-rhombus`               | `Polygon` (or `Diamond` variant)  |
| `fi-rr-document`              | `FileText`                        |
| `fi-rr-check` / severity pass | `Check`                           |
| `fi-rr-exclamation` / contested | `Warning`                       |
| `fi-rr-cross` / foreclosed    | `X`                               |
| `fi-rr-minus` / not applicable | `Minus`                          |
| `fi-rr-sparkles` / AI attribution | `Sparkle`                     |
| `fi-rr-star` / milestone      | `Star`                            |

Phosphor weights map cleanly to UICONS families: `regular` ≈ regular-rounded, `bold` ≈ bold-rounded, `fill` ≈ solid-rounded.

## Primitive replacements (shadcn registry)

| Existing argmap primitive                  | Replacement              | Notes                                                                                                  |
| ------------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------ |
| `primitives/button.tsx`                    | `Button` (shadcn)        | 6 shadcn variants vs 5 argmap variants. Map: argmap `primary` → shadcn `default`; argmap `destructive-solid` retained via custom variant. |
| `primitives/icon-button.tsx`               | `Button size="icon"`     | Two-layer outline/solid cross-fade re-implemented via Phosphor weight switch on hover.                |
| `primitives/dialog.tsx`                    | `Dialog` (shadcn)        | shadcn Dialog uses Radix; same focus trap + escape close.                                              |
| `primitives/drawer.tsx`                    | `Sheet` (shadcn)         | shadcn Sheet covers side/bottom drawer use case.                                                       |
| `primitives/tooltip.tsx`                   | `Tooltip` (shadcn)       | shadcn uses Radix Tooltip with Floating UI internally.                                                 |
| `primitives/glossary-tooltip.tsx`          | Tooltip wrapper          | Kept as argmap-specific wrapper around shadcn `Tooltip`.                                               |
| `primitives/pill.tsx`                      | `Badge` (shadcn)         | Argmap data-tone variants map to shadcn Badge variants; custom tones added via cva.                    |
| `primitives/status-badge.tsx`              | Argmap-specific          | Kept (domain logic); restyled to use new tokens + Phosphor glyphs.                                     |
| `primitives/ai-attribution-chip.tsx`       | Argmap-specific          | Kept (domain logic); uses `Sparkle` from Phosphor.                                                     |
| `primitives/segmented-toggle.tsx`          | `ToggleGroup` (shadcn)   | shadcn `ToggleGroup` is the radix-based equivalent.                                                    |
| `primitives/type-icon.tsx`                 | Argmap-specific          | Kept; rewires to Phosphor.                                                                             |
| `primitives/severity-icon.tsx`             | Argmap-specific          | Kept; rewires to Phosphor.                                                                             |
| `primitives/uicon.tsx`                     | **Removed**              | Replaced by direct Phosphor imports.                                                                   |
| `primitives/inline-alert.tsx`              | `Alert` (shadcn)         | shadcn Alert has matching variants.                                                                    |
| `primitives/toast.tsx`                     | `sonner` (shadcn)        | shadcn standard toast adapter; replaces hand-rolled toast layer.                                       |
| `primitives/loading-screen.tsx`            | Argmap-specific          | Kept; restyled with shadcn `Skeleton` or simple spinner.                                               |
| `primitives/confirm-dialog.tsx`            | `AlertDialog` (shadcn)   | shadcn `AlertDialog` is the canonical confirm pattern.                                                 |

Form elements (used inline in editor components):
| Existing                                   | Replacement              |
| ------------------------------------------ | ------------------------ |
| `<input class="argmap-input">`             | `Input` (shadcn)         |
| `<textarea class="argmap-input">`          | `Textarea` (shadcn)      |
| `<select class="argmap-input">`            | `Select` (shadcn)        |
| Native radio (`appearance: none` restyle)  | `RadioGroup` (shadcn)    |
| Native checkbox                            | `Checkbox` (shadcn)      |

Additional shadcn primitives installed for surface-level use:
- `Tabs` — replaces existing tab implementations (output viewer, settings sections)
- `Card` — replaces `.argmap-card` (frame summary cards, etc.)
- `Popover` — for inline editors / condition pickers
- `DropdownMenu` — for context menus
- `Separator` — for visual section breaks
- `ScrollArea` — for tall scrollable panes
- `Skeleton` — for loading states
- `Accordion` — for collapsible bottom panel sections
- `Switch` — for toggle settings (G12 advisory toggle, etc.)
- `Label` — for form labels
- `Sonner` — toast provider

## Surface-level changes

| Surface                                | Owner agent | Approach |
| -------------------------------------- | ----------- | -------- |
| `src/ui/primitives/`                   | Foundation  | Wholesale replacement of primitives with shadcn-backed wrappers under same export names. |
| `src/ui/chrome/`                       | Foundation  | Top-bar rebuilt with shadcn primitives; mode/flavor chip preserved. |
| `src/ui/home/`                         | Agent A     | FrameSummaryCard → `Card`; new-frame entry uses shadcn `Button`; layout grid via Tailwind. |
| `src/ui/onboarding/` + `src/ui/auth/`  | Agent A     | Welcome screen + sign-in form via shadcn `Card`+`Input`+`Button`; coachmarks keep react-joyride. |
| `src/ui/frame-building/`               | Agent B     | Three-pane layout: left palette via `Button` + `ScrollArea`; right inspector via shadcn forms; validation drawer via `Sheet`. |
| `src/ui/argument-running/`             | Agent C     | Two-pane layout: interview pane via shadcn rows; output viewer tabs via `Tabs`; bottom panel via `Accordion`. |
| `src/ui/version-history/`              | Agent D     | Side pane via `Sheet`; version tree via Tailwind layout; preview banner via `Alert`. |
| `src/ui/session-settings/` + `src/ui/mode-change/` + `src/ui/session-migration/` | Agent E | Dialogs via `Dialog`/`AlertDialog`; orphan resolution rows via shadcn forms. |
| `src/ui/canvas/` (React Flow)          | Sequential post-fan-out | Node renderers: re-skin via Tailwind + tokens, preserve `[data-status]`/`[data-kind]` semantics; edge renderers: token color swap; toolbar: shadcn icon buttons. |

## Files NOT changing

- Schema (`src/schema/`)
- State management (`src/state/`)
- Persistence (`src/persistence/`)
- Mode logic (`src/modes/`)
- Runtime (`src/runtime/`)
- LLM hooks (`src/llm-hooks/`)
- Layout engine (`src/layout/`)
- Routing logic (`src/ui/routing.ts`) — paths preserved
- Stream documents (per Article XI § 1 immutability)

## Stack changes

| Package                              | Action  | Reason                          |
| ------------------------------------ | ------- | ------------------------------- |
| `tailwindcss@^4.2.1`                 | Add     | Required by shadcn              |
| `@tailwindcss/vite@^4.2.1`           | Add     | Vite plugin for Tailwind v4     |
| `tw-animate-css@^1.4.0`              | Add     | Animation primitives            |
| `@fontsource-variable/inter@^5.2.8`  | Add     | Self-hosted Inter (drops CDN)   |
| `class-variance-authority@^0.7.1`    | Add     | Variant typing                  |
| `clsx@^2.1.1`                        | Add     | Class-name composition          |
| `tailwind-merge@^3.6.0`              | Add     | Class-name dedup                |
| `radix-ui@^1.4.3`                    | Add     | Umbrella radix primitives       |
| `@phosphor-icons/react@^2.1.10`      | Add     | Icon library                    |
| `prettier-plugin-tailwindcss@^0.7.2` | Add (dev) | Tailwind class sorting        |
| `shadcn` (CLI)                       | (dev)   | Run via `npx`, no install needed|
| UICONS CDN links in `index.html`     | Remove  | Replaced by Phosphor            |
| Google Fonts CDN link in `index.html`| Remove  | Replaced by `@fontsource-variable/inter` |

## Config changes

- `package.json`: add `imports` field with `#components/*`, `#lib/*`, `#hooks/*`, `#ui/*` per user's shared shadcn doc.
- `tsconfig.json`: add `"resolvePackageJsonImports": true`. Existing `@/` paths remain for backward compatibility with the ~hundreds of existing argmap files.
- `vite.config.ts`: add `tailwindcss()` plugin.
- New `components.json`: shadcn config using `#...` aliases.
- New `src/lib/utils.ts`: `cn()` helper.
- New `src/index.css`: Tailwind imports + preset theme tokens + import of existing argmap tokens.css + import of existing global.css.
- `src/main.tsx`: replace three separate CSS imports with single `./index.css`.
- `index.html`: drop UICONS + Google Fonts CDN links.

## Test impact

- 982 UI tests under `tests/ui/`. Most use role-based queries (resilient). Class-name assertions on `.argmap-btn`, `.argmap-pill`, `.argmap-icon-btn`, `.argmap-dialog`, etc. will break and need updating to either shadcn class patterns or role-based assertions.
- e2e tests under `tests/e2e/` use Playwright. Should mostly survive if role + text are preserved.
- Tests asserting on `[data-status]`, `[data-kind]`, `[data-variant]` data attributes — these are preserved.

Plan: don't pre-update tests. Run after surface migration, fix per-test based on actual breakage.

## Deferred

- Dark theme (Stream E deferral; preset has `.dark` block ready)
- Responsive / mobile layouts (Stream E deferral)
- Full WCAG 2.1 AA audit (Stream H/I deferral)
- Print stylesheet

## Determinism + Constitution compliance

Per Article II § 1 (frame/argument split), § 2 (determinism), § 3 (per-node satisfaction criteria), § 4 (independent versioning), § 5 (human-readable structure): nothing in this overhaul touches runtime computation, persistence, or canonical IDs. Visual treatment of nodes carries the five-status semantic via `[data-status]` attribute, preserving readability.

Per Article XI § 1: stream documents remain immutable. An amendment doc (`stream_e_amendment_1.html`) will be produced documenting the visual identity change (warm-neutral → pure neutral, UICONS → Phosphor) and the adoption of shadcn as the component library.

Per CLAUDE.md: this is overhaul-scale work, so it will **NOT be auto-deployed** to Vercel. The user will get a reviewable branch and authorize deploy explicitly.
