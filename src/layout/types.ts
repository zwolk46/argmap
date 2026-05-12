import type { NodeRef } from "@/schema";

export interface LayoutPosition {
  node_id: NodeRef;
  x: number;
  y: number;
}

export interface LayoutResult {
  positions: LayoutPosition[];
  width: number;
  height: number;
  computed_at: string;
}

export interface LayoutOptions {
  direction: "DOWN" | "RIGHT";
  honor_user_anchors: boolean;
  collapse_subquestions: boolean;
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  direction: "DOWN",
  honor_user_anchors: true,
  collapse_subquestions: true,
};

export interface LayoutDeps {
  now?: () => string;
}

export function resolveLayoutOptions(opts: Partial<LayoutOptions> | undefined): LayoutOptions {
  return { ...DEFAULT_LAYOUT_OPTIONS, ...(opts ?? {}) };
}

export function resolveLayoutDeps(deps: LayoutDeps | undefined): Required<LayoutDeps> {
  return { now: deps?.now ?? (() => new Date().toISOString()) };
}
