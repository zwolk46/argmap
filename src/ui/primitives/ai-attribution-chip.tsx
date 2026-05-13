import type { ReactElement } from "react";
import type { HookInvocationRecord } from "@/llm-hooks";
import { Tooltip } from "./tooltip";

const HOOK_SHORT_NAMES: Record<string, string> = {
  G1: "checkpoint",
  G2: "interp",
  G3: "summary",
  G4: "cross",
  G5: "burden",
  G6: "rewrite",
  G7: "alt-path",
  G8: "direction",
  G9: "authority",
  G10: "jurisdiction",
  G11: "gate",
  G12: "advisory",
  G13: "advisor",
};

export function hookShortName(hook_id: string): string {
  return HOOK_SHORT_NAMES[hook_id] ?? hook_id;
}

export interface AiAttributionChipProps {
  record: HookInvocationRecord;
}

export function AiAttributionChip({ record }: AiAttributionChipProps): ReactElement {
  const short = hookShortName(record.hook_id);
  const tooltipContent = (
    <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
      <div>
        <strong>Hook:</strong> {record.hook_id}
      </div>
      <div>
        <strong>Prompt:</strong> {record.prompt_version}
      </div>
      <div>
        <strong>Model:</strong> {record.model_id}
      </div>
      <div>
        <strong>Generated:</strong> {record.invoked_at}
      </div>
    </div>
  );

  return (
    <Tooltip content={tooltipContent}>
      <span
        data-testid="ai-attribution-chip"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "2px",
          padding: "0 var(--space-1)",
          height: "var(--space-4)",
          borderRadius: "var(--radius-pill)",
          background: "var(--color-ai-accent-bg)",
          color: "var(--color-ai-accent)",
          fontSize: "var(--font-size-2xs)",
          fontWeight: "var(--font-weight-medium)",
          fontFamily: "var(--font-sans)",
          cursor: "help",
          border: "1px solid transparent",
          transition: `border-color var(--duration-fast) var(--ease-standard)`,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--color-ai-accent-strong)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "transparent";
        }}
      >
        ✦ {short}
      </span>
    </Tooltip>
  );
}
