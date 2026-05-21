import * as React from "react";
import type { ReactElement } from "react";
import {
  House,
  Plus,
  FileText,
  SignOut,
  Question,
  ClockCounterClockwise,
  ArrowsOutLineHorizontal,
} from "@phosphor-icons/react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "#components/ui/command";
import { useAppStateStore, useRepository } from "@/state";
import { useNavigate } from "../routing";
import { useAuth } from "../auth/auth-context";
import type { FrameSummary } from "../home/frame-summary-card";

/**
 * Global command palette. Opens on ⌘K / Ctrl+K from anywhere in the app.
 *
 * Categories:
 *   - Jump to frame  — every frame the user has, by title
 *   - Jump to node   — when on a frame-building or argument-running page,
 *                       all nodes in the current frame_version
 *   - Actions        — New frame, Go home, Toggle help, Sign out
 *
 * Mounted from app-routes so it's reachable from every page.
 */
export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the "Toggle version history" action is shown and wired. */
  on_toggle_version_history?: () => void;
  /** When set, the "Help & glossary" action is shown and wired. */
  on_toggle_help?: () => void;
}

export function CommandPalette(props: CommandPaletteProps): ReactElement {
  const { open, onOpenChange, on_toggle_version_history, on_toggle_help } = props;
  const frames = useAppStateStore((s) => s.frames);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { app_state_store, autosave } = useRepository();

  function close_and(fn: () => void) {
    onOpenChange(false);
    // Defer so the dialog gets a clean unmount before the navigation runs.
    setTimeout(fn, 0);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command, or search frames…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem value="go home" onSelect={() => close_and(() => navigate({ kind: "home" }))}>
            <House />
            <span>Go home</span>
            <CommandShortcut>H</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="new frame create"
            onSelect={() =>
              close_and(() => {
                // Drop the user on the home page where the "New frame" dialog
                // lives; the open-on-mount flag in NewFrameWizard tooling is
                // not wired here (the user can click the visible CTA).
                navigate({ kind: "home" });
              })
            }
          >
            <Plus />
            <span>New frame…</span>
          </CommandItem>
          {on_toggle_version_history ? (
            <CommandItem
              value="toggle version history"
              onSelect={() => close_and(() => on_toggle_version_history())}
            >
              <ClockCounterClockwise />
              <span>Toggle version history</span>
            </CommandItem>
          ) : null}
          {on_toggle_help ? (
            <CommandItem
              value="toggle help glossary"
              onSelect={() => close_and(() => on_toggle_help())}
            >
              <Question />
              <span>Toggle help & glossary</span>
            </CommandItem>
          ) : null}
          <CommandItem
            value="reset panel sizes layout"
            onSelect={() =>
              close_and(() => {
                // Pane states persist to localStorage under keys like
                // "argmap.fb.left.state.v1". Wiping them and reloading puts
                // every pane back to its coded "default" width.
                if (typeof window !== "undefined") {
                  const keys: string[] = [];
                  for (let i = 0; i < window.localStorage.length; i++) {
                    const k = window.localStorage.key(i);
                    if (k && k.startsWith("argmap.") && k.endsWith(".state.v1")) keys.push(k);
                  }
                  keys.forEach((k) => window.localStorage.removeItem(k));
                  window.location.reload();
                }
              })
            }
          >
            <ArrowsOutLineHorizontal />
            <span>Reset panel sizes</span>
          </CommandItem>
          <CommandItem
            value="sign out"
            onSelect={() =>
              close_and(async () => {
                void autosave.flushAppState();
                await signOut();
              })
            }
          >
            <SignOut />
            <span>Sign out</span>
          </CommandItem>
        </CommandGroup>

        {frames.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Jump to frame">
              {frames.slice(0, 30).map((f: FrameSummary) => (
                <CommandItem
                  key={f.id}
                  value={`frame ${f.title || "Untitled frame"} ${f.id}`}
                  onSelect={() =>
                    close_and(() => {
                      app_state_store.getState().setRecent(f.id);
                      navigate({ kind: "frame_building", frame_id: f.id });
                    })
                  }
                >
                  <FileText />
                  <span className="truncate">{f.title || "Untitled frame"}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {humanizeMode(f.mode, f.flavor)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}

function humanizeMode(mode: "legal" | "general", flavor?: "personal" | "academic"): string {
  if (mode === "legal") return "Legal";
  if (flavor === "academic") return "Academic";
  if (flavor === "personal") return "Personal";
  return "General";
}

/**
 * Wires the ⌘K / Ctrl+K global keyboard shortcut. Returns `[open, setOpen]`
 * for the palette dialog.
 */
export function useCommandPaletteShortcut(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    function handle(e: KeyboardEvent) {
      // Don't intercept ⌘K when the user is editing in an input or textarea —
      // many text editors use the same combo for "insert link." We only fire
      // when focus is on body or a non-form element.
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const editable = target?.isContentEditable;
      const in_form_field =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || editable === true;
      if (in_form_field) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  return [open, setOpen];
}
