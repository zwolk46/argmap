import * as React from "react";
import type { ReactElement } from "react";
import type { LlmSettings } from "@/schema";
import { useFrameStore } from "@/state";
import { Switch } from "#components/ui/switch";
import { Label } from "#components/ui/label";

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
  // The G12 setting is owned per-frame in Frame Settings. This section is
  // an indicator-only Switch with a navigate-elsewhere link; we render
  // `checked` (reflecting the effective state) and mark it disabled, so the
  // user can read the current state and learn where to change it. There is
  // no patch wired up here — the parent panel doesn't have a patch action
  // surface for per-frame LLM settings.
  const toggle_id = React.useId();
  return (
    <section data-testid="g12-section" className="mb-3">
      <header className="mb-2 text-sm font-medium">Advisory notes (G12)</header>
      {/* §9 #36: an inline gloss replaces the bare "Cross-implication advisories"
          label — a first-time user opening the panel had no way to learn what
          the feature did without leaving the panel for the help glossary. */}
      <p className="mb-1 text-xs text-muted-foreground">
        Surface non-blocking notes when an answer in one sub-question may bear on another (e.g.,
        findings reused across elements).
      </p>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={toggle_id} className="text-sm font-normal">
          Cross-implication advisories
        </Label>
        <div className="flex items-center gap-2">
          <span
            data-testid="g12-status"
            data-enabled={enabled ? "true" : "false"}
            className="text-xs text-muted-foreground"
          >
            {enabled ? "Enabled" : "Disabled"}
          </span>
          <Switch
            id={toggle_id}
            checked={enabled}
            disabled
            aria-readonly="true"
            data-testid="g12-toggle"
          />
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Set per-frame in Frame Building.{" "}
        {/* §9 #28: link copy reads honestly — navigating doesn't auto-open
            the frame settings drawer; the user opens it themselves from the
            top bar. */}
        <button
          type="button"
          data-testid="g12-open-frame-settings"
          onClick={props.on_open_frame_settings}
          className="cursor-pointer border-0 bg-transparent p-0 text-[var(--color-mode-current-accent)] underline-offset-2 hover:underline"
        >
          Go to Frame Building
        </button>{" "}
        and open the settings panel there to configure.
      </p>
    </section>
  );
}
