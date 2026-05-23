# ui/session-settings

Session-settings panel mounted page-locally inside `ArgumentRunningPage`. A
right-edge `Drawer` with four sections (Metadata, G6 output rewrite, G12
advisory toggle (read-only), Archive and Delete).

**Spec:** retired 2026-05-23 (was `docs/stream_i_ui_session_settings_spec_v1.html`); this README is now the source of truth.
**Coding session:** I.9d3 (2026-05-12).

## Public API

```typescript
import {
  SessionSettingsPanel,
  G6RemoveRewriteSection,
  G12AdvisoryToggleSection,
  ArchiveDeleteSection,
  MetadataSection,
  g12EffectiveEnabled,
  previewProse,
} from "@/ui/session-settings";
```

| Surface                    | Role                                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SessionSettingsPanel`     | Drawer-shaped panel composing the four sections. Open state owned by `ArgumentRunningPage` (page-local mount per F-007/F-024).                                                 |
| `MetadataSection`          | Title + description inputs (dispatch `session_metadata_edited`). Archived banner with Unarchive when `session.archived === true`.                                              |
| `G6RemoveRewriteSection`   | Read-only preview of `current_version.output_overrides.rewritten_prose` + destructive `Remove rewrite` button that dispatches the new `output_overrides_cleared` SessionPatch. |
| `G12AdvisoryToggleSection` | **Read-only** display of frame-scope `llm_settings.runtime_hooks_enabled` + `per_hook_enabled.cross_implications`, with a "frame settings" link the page wires.                |
| `ArchiveDeleteSection`     | Archive toggle (dispatches `session_metadata_edited({ archived })`); destructive Delete with type-the-title guard.                                                             |
| `g12EffectiveEnabled`      | Pure helper. `per_hook_enabled.cross_implications` wins when defined; otherwise `runtime_hooks_enabled`.                                                                       |
| `previewProse`             | Pure helper: truncate-with-ellipsis at 120 chars by default.                                                                                                                   |

## State-layer + schema (already in place, F-008)

- `SessionPatch` includes `{ kind: "output_overrides_cleared" }`.
- `SessionActionDispatchTable.output_overrides_cleared` clears the override
  field in a new ArgumentSessionVersion.
- `ArgumentSession.archived?: boolean` field.
- `session_metadata_edited.partial` Pick includes `archived`.
- `AppStateStore.deleteSession(session_id)` wraps `Repository.deleteSession`.

## Wiring into ArgumentRunningPage

```tsx
const [session_settings_open, setSessionSettingsOpen] = useState(false);

<ArgumentRunningTopBar deps={{ /* ... */ on_open_session_settings: () => setSessionSettingsOpen(true) }} />

<SessionSettingsPanel
  open={session_settings_open}
  on_close={() => setSessionSettingsOpen(false)}
  on_open_frame_settings={() => {
    setSessionSettingsOpen(false);
    navigate({ kind: "frame_building", frame_id });
  }}
  on_delete_session={async () => {
    await app_state_store.getState().deleteSession(session.id);
    navigate({ kind: "frame_building", frame_id });
  }}
/>
```

The pre-existing `on_open_session_settings` deps slot on
`ArgumentRunningTopBarDeps` (which was previously rendered as a disabled
IconButton in `buildTopBarSlots`) becomes the live entry point; the disabled
state in the slot is dropped.

## Conceptual question resolution

G12 toggle reads frame-scope `llm_settings` **read-only** and links to frame
settings — no session-scope schema is added in v1. See spec for the Article IV
§ 4 substantial-hesitation analysis. If feedback indicates session-scope
override is needed post-v1, the additive field
`ArgumentSession.llm_overrides?` joins additively.

## Tests

`tests/ui/session-settings/` (10 tests across 3 files): `g12-effective-enabled`,
`preview-prose`, basic panel render-gating.
