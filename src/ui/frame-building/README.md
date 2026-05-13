# ui/frame-building

Frame-building UI — the primary editing surface for constructing argument frames.

## Public API

```typescript
import { FrameBuildingPage } from "@/ui/frame-building";
// or from the top-level barrel:
import { FrameBuildingPage } from "@/ui";
```

### `FrameBuildingPage`

```typescript
interface FrameBuildingPageProps {
  frame_id: FrameId;
  onOpenModeChangeDialog?: () => void;
  onToggleVersionHistory?: () => void;
}
```

The top-level page component. Composes: `TopBar`, `FrameCanvas` (with ELK layout), left-pane outline, right-pane inspector, `ValidationDrawer`, `SuggestionDrawer`, `FrameSettingsPanel`, `CascadeDeleteDialog`, `AutoArrangeFlow`, and `HelpGlossaryPane`.

## Sub-module structure

| Directory                | Purpose                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `left-pane/`             | `OutlineTree` (node list) + `NodePalette` (add-node buttons)                                               |
| `right-pane/`            | `Inspector` (node/edge/multi selection), per-type editors, condition management, field attribution         |
| `validation-drawer/`     | Sliding drawer listing errors and warnings; supports per-warning dismissal                                 |
| `cascade-delete-dialog/` | Confirmation dialog for node deletions that affect dependent edges/nodes                                   |
| `frame-settings/`        | Drawer for frame metadata, mode/flavor, jurisdiction, default policies, pin/archive/delete                 |
| `auto-arrange/`          | One-shot confirmation dialog that resets all `presentation_hints` via `presentation_hints_reset_all` patch |

## Key implementation decisions

### Import boundaries

Uses relative `../` imports for sibling UI modules (`../chrome`, `../canvas`, `../ai-suggestion`, `../hooks`, `../routing`) rather than the `@/ui` barrel alias. This avoids a circular dependency since `@/ui/index.ts` re-exports `FrameBuildingPage`.

### Node position encoding

Node positions are stored under `node.presentation.x` and `node.presentation.y`, not flat `node.x`/`node.y`. The `on_node_moved` handler patches `{ presentation: { x, y } } as unknown as Partial<Node>`.

### Warning dismissal key

`dismissalKeyFor(result, frame_id)` produces `"${frame_id}:${rule_id}:${node_id ?? edge_id ?? "frame"}"`. Keys are stored in `AppState.dismissed_warnings` (a `Record<string, true>`). The `undismissWarning` method on `AppStateStore` removes a key by destructuring.

### Hook ordering in `InspectorNode`

`useEditMode(node)` is called before the `if (!node) return` guard. The hook accepts `Node | undefined` and initialises the mode from the optional node's `options_box` field.

### `FrameCanvas` integration

`FrameCanvas` requires a `layout_result` prop (from `useLayoutResult`) and accepts a canvas handle via `handle={canvas_ref}` (not `ref`). Layout is computed from `frame_version ?? EMPTY_FRAME_VERSION`.

### NODE_TYPE_EDITORS registry

The `NODE_TYPE_EDITORS` map is typed as `Record<string, React.ComponentType<any>>`. The `any` is intentional — it's a dispatch table keyed by runtime node type. An `eslint-disable-next-line` suppresses the lint warning at the single declaration site.
