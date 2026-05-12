import type { ReactElement } from "react";
import type { NodeStatus } from "@/schema";
import { StatusBadge } from "../primitives/status-badge";

export interface StatusBadgeOverlayProps {
  status: NodeStatus;
  legal_mode?: boolean;
}

export function StatusBadgeOverlay({ status, legal_mode }: StatusBadgeOverlayProps): ReactElement {
  return (
    <div data-testid="status-badge-overlay">
      <StatusBadge status={status} legal_mode={legal_mode} size="sm" />
    </div>
  );
}
