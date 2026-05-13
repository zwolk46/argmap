import * as React from "react";
import type { FrameVersion, Mode, Flavor, Position } from "@/schema";
import type { TransitionResult } from "@/state";
import { attemptTransition } from "@/state";

export interface UseModeChangeScanInput {
  current_version: FrameVersion;
  current_mode: Mode;
  current_flavor: Flavor | undefined;
  target_mode: Mode;
  target_flavor: Flavor | undefined;
  current_positions: Position[];
  staged_positions: Position[];
}

export interface UseModeChangeScanOutput {
  result: TransitionResult;
  rescan: () => void;
}

export function useModeChangeScan(input: UseModeChangeScanInput): UseModeChangeScanOutput {
  const [epoch, setEpoch] = React.useState(0);

  const positions_key =
    input.current_positions.map((p) => p.id).join("|") +
    "#" +
    input.staged_positions.map((p) => p.id).join("|");
  const result = React.useMemo<TransitionResult>(() => {
    const positions: Position[] = [...input.current_positions, ...input.staged_positions];
    return attemptTransition(
      "architectural",
      {
        frame: input.current_version,
        mode: input.current_mode,
        flavor: input.current_flavor,
        positions,
      },
      { mode: input.target_mode, flavor: input.target_flavor },
      undefined,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    input.current_version.id,
    input.current_mode,
    input.current_flavor,
    input.target_mode,
    input.target_flavor,
    positions_key,
    epoch,
  ]);

  const rescan = React.useCallback(() => setEpoch((e) => e + 1), []);
  return { result, rescan };
}
