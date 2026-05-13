import * as React from "react";
import { useAppStateStore, useRepository, selectCoachmarkDismissed } from "@/state";
import {
  type CoachmarkId,
  isCoachmarkId,
  UnknownCoachmarkIdError,
} from "./coachmark-registry";

export interface UseCoachmarkReturn {
  visible: boolean;
  dismiss: () => void;
  dismiss_on_act: () => void;
  ref: React.RefObject<HTMLElement | null>;
}

export function useCoachmark(id: CoachmarkId): UseCoachmarkReturn {
  if (!isCoachmarkId(id)) throw new UnknownCoachmarkIdError(id);
  const visible = useAppStateStore((s) => !selectCoachmarkDismissed(s.app_state, id));
  const { app_state_store } = useRepository();
  const ref = React.useRef<HTMLElement | null>(null);

  const dismiss = React.useCallback(() => {
    app_state_store.getState().dismissCoachmark(id);
  }, [app_state_store, id]);

  return { visible, dismiss, dismiss_on_act: dismiss, ref };
}
