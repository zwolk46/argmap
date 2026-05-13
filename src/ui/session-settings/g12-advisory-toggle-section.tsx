import type { ReactElement } from "react";
import type { LlmSettings } from "@/schema";
import { useFrameStore } from "@/state";
import { Pill } from "../primitives";

export interface G12AdvisoryToggleSectionProps {
  on_open_frame_settings: () => void;
}

export function g12EffectiveEnabled(llm: LlmSettings | undefined): boolean {
  if (!llm) return false;
  const runtime_on = llm.runtime_hooks_enabled === true;
  const per_hook = llm.per_hook_enabled?.cross_implications;
  if (per_hook === false) return false;
  if (per_hook === true) return true;
  return runtime_on;
}

export function G12AdvisoryToggleSection(props: G12AdvisoryToggleSectionProps): ReactElement {
  const llm = useFrameStore((s) => s.frame?.llm_settings);
  const enabled = g12EffectiveEnabled(llm);
  return (
    <section data-testid="g12-section" style={{ marginBottom: "var(--space-3, 12px)" }}>
      <header
        style={{
          fontSize: "var(--font-size-sm, 13px)",
          fontWeight: 500,
          marginBottom: "var(--space-2, 8px)",
        }}
      >
        Advisory notes (G12)
      </header>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-2, 8px)",
        }}
      >
        <span style={{ fontSize: "var(--font-size-sm, 13px)" }}>Cross-implication advisories</span>
        <Pill
          color={
            enabled ? "var(--color-text-success, #166534)" : "var(--color-text-secondary, #6b7280)"
          }
          bg={
            enabled
              ? "var(--color-background-success, #dcfce7)"
              : "var(--color-status-open-bg, #f3f4f6)"
          }
        >
          <span data-testid="g12-status">{enabled ? "Enabled" : "Disabled"}</span>
        </Pill>
      </div>
      <p
        style={{
          fontSize: "var(--font-size-xs, 11px)",
          color: "var(--color-text-secondary, #6b7280)",
          marginTop: "var(--space-1, 4px)",
        }}
      >
        Set per-frame in{" "}
        <button
          type="button"
          data-testid="g12-open-frame-settings"
          onClick={props.on_open_frame_settings}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--color-mode-current-accent, #1d4ed8)",
            cursor: "pointer",
            padding: 0,
          }}
        >
          frame settings
        </button>
        .
      </p>
    </section>
  );
}
