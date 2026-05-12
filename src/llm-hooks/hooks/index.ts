import type { HookContract } from "../types";
import { g1Hook } from "./g1-checkpoint-question";
import { g2Hook } from "./g2-interpretation-suggestion";
import { g3Hook } from "./g3-conclusion-reasoning";
import { g4Hook } from "./g4-gap-detection";
import { g5Hook } from "./g5-burden-calibration";
import { g6Hook } from "./g6-prose-rewrite";
import { g7Hook } from "./g7-premise-reuse-ranking";
import { g8Hook } from "./g8-conclusion-direction";
import { g9Hook } from "./g9-position-table";
import { g10Hook } from "./g10-frame-template-ranking";
import { g11Hook } from "./g11-premise-drafting";
import { g12Hook } from "./g12-cross-implications";
import { g13Hook } from "./g13-change-summary";

export {
  g1Hook,
  g2Hook,
  g3Hook,
  g4Hook,
  g5Hook,
  g6Hook,
  g7Hook,
  g8Hook,
  g9Hook,
  g10Hook,
  g11Hook,
  g12Hook,
  g13Hook,
};

export const ALL_HOOKS: HookContract<unknown, unknown>[] = [
  g1Hook,
  g2Hook,
  g3Hook,
  g4Hook,
  g5Hook,
  g6Hook,
  g7Hook,
  g8Hook,
  g9Hook,
  g10Hook,
  g11Hook,
  g12Hook,
  g13Hook,
] as unknown as HookContract<unknown, unknown>[];
