import * as React from "react";
import type { NodeRef, Authority, Node } from "@/schema";
import { useFrameStore, useSessionStore, useRepository } from "@/state";
import { Button } from "#components/ui/button";
import { Label } from "#components/ui/label";
import { Input } from "#components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "#components/ui/select";

// Stable empty-array fallbacks. Zustand selectors must return a reference
// that is `Object.is`-stable across renders when the underlying value hasn't
// changed; returning a fresh `[]` from a `?? []` fallback (or computing a
// fresh array via `.filter(...)` inside the selector) trips React's
// "Maximum update depth exceeded" loop via useSyncExternalStore.
const EMPTY_NODES: ReadonlyArray<Node> = [];
const EMPTY_AUTHORITIES: ReadonlyArray<Authority> = [];

// Sentinel for the "(none)" option. shadcn Select treats empty string as
// "no value" so we use a non-empty sentinel that round-trips to null.
const NONE_VALUE = "__none__";

export interface AuthorityAttachmentSectionProps {
  value: NodeRef | null;
  on_change: (next: NodeRef | null) => void;
  mode_override?: "legal" | "general";
  flavor_override?: "personal" | "academic";
  frame_authority_opted_in?: boolean;
}

export function authorityPickerVisible(
  mode: "legal" | "general",
  flavor: "personal" | "academic" | undefined,
  frame_authority_opted_in?: boolean,
): boolean {
  if (mode === "legal") return true;
  if (flavor === "academic") return true;
  if (flavor === "personal" && !frame_authority_opted_in) return false;
  return true;
}

export interface NewSessionAuthorityResult {
  kind: "new";
  authority: Authority;
}

export function AuthorityAttachmentSection(
  props: AuthorityAttachmentSectionProps,
): React.ReactElement | null {
  const { value, on_change, mode_override, flavor_override, frame_authority_opted_in } = props;
  const frame_mode = useFrameStore((s) => s.frame?.mode);
  const frame_flavor = useFrameStore((s) => s.frame?.flavor);
  const mode: "legal" | "general" = mode_override ?? (frame_mode === "legal" ? "legal" : "general");
  const flavor = flavor_override ?? (frame_flavor === "academic" ? "academic" : undefined);

  const visible = authorityPickerVisible(mode, flavor, frame_authority_opted_in);
  // Read the nodes array (or the stable empty fallback) from the store, then
  // derive `frame_authorities` in a memoized step. Filtering inside the
  // selector would return a new array each call and loop us.
  const all_frame_nodes = useFrameStore((s) => s.frame_version?.nodes ?? EMPTY_NODES);
  const frame_authorities = React.useMemo(
    () => all_frame_nodes.filter((n): n is Authority => n.type === "Authority"),
    [all_frame_nodes],
  );
  const session_authorities = useSessionStore(
    (s) => s.session?.session_authorities ?? EMPTY_AUTHORITIES,
  ) as ReadonlyArray<Authority>;

  const { session_store, now, generateId } = useRepository();
  const [creating_new, setCreatingNew] = React.useState(false);
  const [new_name, setNewName] = React.useState("");
  const [new_citation, setNewCitation] = React.useState("");

  if (!visible) return null;

  const label = mode === "legal" ? "Authority" : flavor === "academic" ? "Source" : "Authority";

  function commit_new(): void {
    if (new_name.trim().length === 0) return;
    const ts = now();
    const authority: Authority = {
      id: generateId(),
      type: "Authority",
      layer: "argument",
      citation: new_citation || new_name,
      created_at: ts,
      updated_at: ts,
    };
    session_store.getState().applyPatch({ kind: "session_authority_added", authority });
    on_change(authority.id);
    setCreatingNew(false);
    setNewName("");
    setNewCitation("");
  }

  const sorted_frame = [...frame_authorities].sort((a, b) => a.id.localeCompare(b.id));
  const sorted_session = [...session_authorities].sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div data-testid="authority-attachment-section" className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="authority-picker" className="text-xs text-muted-foreground">
          {label}
        </Label>
        <Select
          value={value ?? NONE_VALUE}
          onValueChange={(v) => on_change(v === NONE_VALUE ? null : v)}
        >
          <SelectTrigger
            id="authority-picker"
            data-testid="authority-picker"
            className="w-full text-xs"
          >
            <SelectValue placeholder="(none)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>(none)</SelectItem>
            {sorted_frame.length > 0 ? (
              <SelectGroup>
                <SelectLabel>Frame authorities</SelectLabel>
                {sorted_frame.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.citation}
                  </SelectItem>
                ))}
              </SelectGroup>
            ) : null}
            {sorted_session.length > 0 ? (
              <SelectGroup>
                <SelectLabel>Session authorities</SelectLabel>
                {sorted_session.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.citation}
                  </SelectItem>
                ))}
              </SelectGroup>
            ) : null}
          </SelectContent>
        </Select>
      </div>
      {creating_new ? (
        <div
          data-testid="authority-new-form"
          className="flex flex-col gap-1 rounded-md bg-muted/50 p-2"
        >
          <Input
            data-testid="authority-new-name"
            value={new_name}
            placeholder="Name"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit_new();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setCreatingNew(false);
              }
            }}
            className="text-xs"
          />
          <Input
            data-testid="authority-new-citation"
            value={new_citation}
            placeholder="Citation"
            onChange={(e) => setNewCitation(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit_new();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setCreatingNew(false);
              }
            }}
            className="text-xs"
          />
          <div className="flex gap-1">
            <Button
              type="button"
              variant="default"
              size="sm"
              data-testid="authority-new-save"
              onClick={commit_new}
            >
              Save
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setCreatingNew(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="authority-new-toggle"
          onClick={() => setCreatingNew(true)}
          className="self-start"
        >
          + New session {label.toLowerCase()}
        </Button>
      )}
    </div>
  );
}
