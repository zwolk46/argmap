# `src/ui/`

React UI layer for the argument mapping application. Implemented in session I.9a.

## Module structure

| Sub-directory | Contents |
|---|---|
| `primitives/` | Stateless design-system atoms: `TypeIcon`, `SeverityIcon`, `Tooltip`, `GlossaryTooltip`, `Dialog`, `Drawer`, `SegmentedToggle`, `StatusBadge`, `AiAttributionChip` |
| `chrome/` | Top-bar chrome: `AppChrome`, `FrameTitle`, `ModeFavorChip`, `OperatingModeToggle`, `ValidationIndicator`, `CascadeConfirmationDialog` |
| `canvas/` | React Flow canvas layer: `FrameCanvas`, node renderers, edge renderers, `StatusBadgeOverlay`, `EdgeCreationPopup`, layout consumer |
| `ai-suggestion/` | `SuggestionDrawer` — AI hook result display and accept/reject UI |
| `hooks/` | `useAiSuggestion`, `useCascadeConfirmation`, `useKeyboardShortcuts`, `useReduceMotion` |
| `styles/` | CSS design tokens (`tokens.css`, `animations.css`) |
| `routing.ts` | Hash-based routing: `routeFromHash`, `hashFromRoute`, `navigate`, `useRoute`, `useNavigate` |
| `pages.tsx` | Page stubs: `FrameBuildingPage`, `ArgumentRunningPage`, `VersionHistoryPane`, `OnboardingWizard` |
| `App.tsx` | Root component; accepts `AppProps` (dependency-injected via `RepositoryProvider`) |
| `error-boundary.tsx` | `AppErrorBoundary` class component |

## Public API

Everything re-exported from `src/ui/index.ts`:

```ts
export { App } from "./App";
export type { AppProps } from "./App";
export * from "./primitives";
export * from "./chrome";
export * from "./canvas";
export * from "./ai-suggestion";
export * from "./hooks";
export { useRoute, useNavigate } from "./routing";
export { FrameBuildingPage, ArgumentRunningPage, VersionHistoryPane, OnboardingWizard } from "./pages";
```

## Key design decisions

**Actions via `useRepository()`, not `useFrameStore` selector.** `useFrameStore` is typed to return only `FrameStoreSnapshot` (read-only fields). Mutation actions (`applyPatch`, `invokeHook`, `resolveSuggestion`) must be accessed as `frame_store.getState().action()` via `useRepository()`. See `src/state/README.md`.

**React Flow type parameters.** `NodeProps<T>` and `EdgeProps<T>` take the full `Node<Data>` / `Edge<Data>` type, not just the data type. Node/edge data interfaces include `[key: string]: unknown` to satisfy React Flow's `Record<string, unknown>` constraint.

**CSS-transform visibility.** `Drawer` is always mounted; open/closed state is communicated via `data-open` attribute and CSS transforms, not conditional rendering. `Dialog` returns `null` when closed.

**Connector handle indicator visibility.** The `data-testid="connector-handle-indicator"` element in `NodeFrame` renders only when `enable_connector_handle && (hovered || display.hovered)`. Tests that assert its presence must pass `display: { ...DEFAULT_DISPLAY, hovered: true }`.

**`Checkpoint` has no outgoing edge types.** The `validEdgeTypesFor` function produces `checkpoint_option_routing` candidates only when the Checkpoint node has an `options` array in its data; there is no `EdgeType` with `Checkpoint` as a source.

## Import boundaries

`src/ui/` may:
- Value-import from `@/schema`, `@/state`, `@/layout`.
- Type-only import from `@/runtime` and `@/llm-hooks`.

`src/ui/` must NOT value-import from `@/persistence`, `@/modes`, `@/runtime`, or `@/llm-hooks`.

## Tests

Tests live in `tests/ui/` and mirror the sub-directory structure. All tests use `// @vitest-environment happy-dom`. 982 total tests pass as of I.9a.
