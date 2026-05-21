import type { ReactElement } from "react";
import type { HookInvocationRecord } from "@/llm-hooks";
import { Tooltip } from "./tooltip";
import { AiSparkle } from "./ai-sparkle";

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

// §12 F-22: the AI rewrite header in `prose-tab.tsx` previously used a
// bespoke styled div because the session-level G6 rewrite has no
// `HookInvocationRecord` to feed this chip (see F-09 for the underlying
// provenance gap). Rather than maintain two AI-attribution looks, this
// chip now accepts either a full record (rich tooltip with model / prompt
// version / timestamp) or a bare `hook_id` (chip with no tooltip). The
// shared chip keeps the visual contract uniform across surfaces.
export interface AiAttributionChipProps {
  record?: HookInvocationRecord | null;
  hook_id?: string;
}

export function AiAttributionChip({
  record,
  hook_id,
}: AiAttributionChipProps): ReactElement | null {
  const effective_hook_id = record?.hook_id ?? hook_id;
  if (!effective_hook_id) return null;
  const short = hookShortName(effective_hook_id);

  const chipSpan = (
    <span
      data-testid="ai-attribution-chip"
      className="inline-flex items-center gap-[3px] rounded-full px-1 py-px text-[10px] font-medium uppercase tracking-wider leading-[1.4] border border-transparent hover:border-[var(--color-ai-accent-strong)] transition-colors"
      style={{
        background: "var(--color-ai-accent-bg)",
        color: "var(--color-ai-accent)",
        cursor: record ? "help" : "default",
      }}
    >
      <AiSparkle size={11} />
      {short}
    </span>
  );

  if (!record) return chipSpan;

  const tooltipContent = (
    <div className="text-sm text-[var(--color-text-secondary)]">
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

  return <Tooltip content={tooltipContent}>{chipSpan}</Tooltip>;
}
