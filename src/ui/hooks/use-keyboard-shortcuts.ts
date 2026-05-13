import * as React from "react";

export interface ShortcutBindings {
  zoom_in?: string;
  zoom_out?: string;
  fit_screen?: string;
  zoom_100?: string;
  focus_search?: string;
  open_help?: string;
  close_overlay?: string;
  pan_up?: string;
  pan_down?: string;
  pan_left?: string;
  pan_right?: string;
}

export const DEFAULT_SHORTCUTS: Required<ShortcutBindings> = {
  zoom_in: "+",
  zoom_out: "-",
  fit_screen: "f",
  zoom_100: "0",
  focus_search: "/",
  open_help: "?",
  close_overlay: "Escape",
  pan_up: "ArrowUp",
  pan_down: "ArrowDown",
  pan_left: "ArrowLeft",
  pan_right: "ArrowRight",
};

export interface ShortcutHandlers {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitScreen?: () => void;
  onZoom100?: () => void;
  onFocusSearch?: () => void;
  onOpenHelp?: () => void;
  onCloseOverlay?: () => void;
  onPanUp?: () => void;
  onPanDown?: () => void;
  onPanLeft?: () => void;
  onPanRight?: () => void;
}

function isInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return target.getAttribute("contenteditable") !== null;
}

export function useKeyboardShortcuts(
  handlers: ShortcutHandlers,
  bindings: ShortcutBindings = {},
): void {
  const effective = { ...DEFAULT_SHORTCUTS, ...bindings };
  const handlersRef = React.useRef(handlers);
  handlersRef.current = handlers;
  const effectiveRef = React.useRef(effective);
  effectiveRef.current = effective;

  React.useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (isInputTarget(e.target)) return;
      const b = effectiveRef.current;
      const h = handlersRef.current;
      const key = e.key;
      if (key === b.zoom_in) {
        e.preventDefault();
        h.onZoomIn?.();
      } else if (key === b.zoom_out) {
        e.preventDefault();
        h.onZoomOut?.();
      } else if (key === b.fit_screen) {
        e.preventDefault();
        h.onFitScreen?.();
      } else if (key === b.zoom_100) {
        e.preventDefault();
        h.onZoom100?.();
      } else if (key === b.focus_search) {
        e.preventDefault();
        h.onFocusSearch?.();
      } else if (key === b.open_help) {
        e.preventDefault();
        h.onOpenHelp?.();
      } else if (key === b.close_overlay) {
        h.onCloseOverlay?.();
      } else if (key === b.pan_up) {
        e.preventDefault();
        h.onPanUp?.();
      } else if (key === b.pan_down) {
        e.preventDefault();
        h.onPanDown?.();
      } else if (key === b.pan_left) {
        e.preventDefault();
        h.onPanLeft?.();
      } else if (key === b.pan_right) {
        e.preventDefault();
        h.onPanRight?.();
      }
    }

    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, []);
}
