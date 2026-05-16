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
    <section data-testid="g12-section" style={{ marginBottom: "var(--space-3)" }}>
      <header
        style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-medium)",
          marginBottom: "var(--space-2)",
        }}
      >
        Advisory notes (G12)
      </header>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-2)",
        }}
      >
        <span style={{ fontSize: "var(--font-size-sm)" }}>Cross-implication advisories</span>
        <Pill
          color={enabled ? "var(--color-text-success)" : "var(--color-text-secondary)"}
          bg={enabled ? "var(--color-background-success)" : "var(--color-status-open-bg)"}
        >
          <span data-testid="g12-status">{enabled ? "Enabled" : "Disabled"}</span>
        </Pill>
      </div>
      <p
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-secondary)",
          marginTop: "var(--space-1)",
        }}
      >
        Set per-frame in Frame Building.{" "}
        {/* §9 #28: link copy reads honestly — navigating doesn't auto-open
            the frame settings drawer; the user opens it themselves from the
            top bar. */}
        <button
          type="button"
          data-testid="g12-open-frame-settings"
          onClick={props.on_open_frame_settings}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--color-mode-current-accent)",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Go to Frame Building
        </button>{" "}
        and open the settings panel there to configure.
      </p>
    </section>
  );
}
