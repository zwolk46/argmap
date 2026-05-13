import * as React from "react";
import { useAppStateStore, useRepository, selectNewFeatureNoticeSeen } from "@/state";

export interface UseNewFeatureNoticeReturn {
  visible: boolean;
  dismiss: () => void;
}

export function useNewFeatureNotice(notice_id: string): UseNewFeatureNoticeReturn {
  const visible = useAppStateStore((s) => !selectNewFeatureNoticeSeen(s.app_state, notice_id));
  const { app_state_store } = useRepository();
  const dismiss = React.useCallback(() => {
    app_state_store.getState().markNewFeatureNoticeSeen(notice_id);
  }, [app_state_store, notice_id]);
  return { visible, dismiss };
}
