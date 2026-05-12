import * as React from "react";
import type { FrameId, SessionId } from "@/schema";

export type Route =
  | { kind: "home" }
  | { kind: "frame_building"; frame_id: FrameId }
  | { kind: "argument_running"; session_id: SessionId };

export const ROUTE_HASH_PATTERN = {
  home: "#/",
  frame_building: "#/frame/",
  argument_running: "#/session/",
} as const;

export function routeFromHash(hash: string): Route {
  if (hash.startsWith(ROUTE_HASH_PATTERN.argument_running)) {
    const session_id = hash.slice(ROUTE_HASH_PATTERN.argument_running.length) as SessionId;
    if (session_id) return { kind: "argument_running", session_id };
  }
  if (hash.startsWith(ROUTE_HASH_PATTERN.frame_building)) {
    const frame_id = hash.slice(ROUTE_HASH_PATTERN.frame_building.length) as FrameId;
    if (frame_id) return { kind: "frame_building", frame_id };
  }
  return { kind: "home" };
}

export function hashFromRoute(route: Route): string {
  switch (route.kind) {
    case "home":
      return ROUTE_HASH_PATTERN.home;
    case "frame_building":
      return ROUTE_HASH_PATTERN.frame_building + route.frame_id;
    case "argument_running":
      return ROUTE_HASH_PATTERN.argument_running + route.session_id;
  }
}

export interface RouterContextValue {
  current: Route;
  navigate: (next: Route) => void;
}

export const RouterContext = React.createContext<RouterContextValue | null>(null);

export function RouterProvider(props: { children: React.ReactNode }): React.ReactElement {
  const [current, setCurrent] = React.useState<Route>(() =>
    routeFromHash(typeof window !== "undefined" ? window.location.hash : "#/"),
  );

  React.useEffect(() => {
    function handleHashChange() {
      setCurrent(routeFromHash(window.location.hash));
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = React.useCallback((next: Route) => {
    const hash = hashFromRoute(next);
    window.location.hash = hash;
    setCurrent(next);
  }, []);

  const value = React.useMemo(() => ({ current, navigate }), [current, navigate]);

  return React.createElement(RouterContext.Provider, { value }, props.children);
}

export class RouterMissingError extends Error {
  constructor() {
    super("useRoute / useNavigate called outside RouterProvider.");
    this.name = "RouterMissingError";
  }
}

export function useRoute(): Route {
  const ctx = React.useContext(RouterContext);
  if (!ctx) throw new RouterMissingError();
  return ctx.current;
}

export function useNavigate(): (next: Route) => void {
  const ctx = React.useContext(RouterContext);
  if (!ctx) throw new RouterMissingError();
  return ctx.navigate;
}

export function navigate(next: Route): void {
  if (typeof window !== "undefined") {
    window.location.hash = hashFromRoute(next);
  }
}
