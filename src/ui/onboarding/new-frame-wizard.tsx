import * as React from "react";
import type { ReactElement } from "react";
import type { Mode, Flavor } from "@/schema";

export interface NewFrameWizardSubmitArgs {
  title: string;
  description?: string;
  mode: Mode;
  flavor?: Flavor;
}

export interface NewFrameWizardProps {
  onSubmit: (args: NewFrameWizardSubmitArgs) => void;
  onCancel: () => void;
  start_at_template_step?: boolean;
}

interface WizardState {
  mode: Mode | null;
  flavor: Flavor | null;
  title: string;
  description: string;
}

export const WIZARD_STEP_TITLES = ["Mode", "Flavor", "Details"] as const;

export function NewFrameWizard(props: NewFrameWizardProps): ReactElement {
  const [state, setState] = React.useState<WizardState>({
    mode: null,
    flavor: null,
    title: "",
    description: "",
  });

  function canSubmit(): boolean {
    if (!state.mode) return false;
    if (state.mode === "general" && !state.flavor) return false;
    if (!state.title.trim()) return false;
    return true;
  }

  function handleSubmit(): void {
    if (!canSubmit()) return;
    props.onSubmit({
      title: state.title.trim(),
      description: state.description.trim() || undefined,
      mode: state.mode!,
      flavor: state.mode === "general" ? state.flavor ?? "personal" : undefined,
    });
  }

  return (
    <div data-testid="new-frame-wizard" style={{ padding: "var(--space-5, 20px)", maxWidth: 480 }}>
      <h2 style={{ fontSize: "var(--font-size-lg, 16px)", fontWeight: 500, margin: 0 }}>
        Create your first frame
      </h2>
      <section style={{ marginTop: "var(--space-3, 12px)" }}>
        <label style={{ display: "block", fontSize: "var(--font-size-sm, 13px)" }}>
          Mode
          <div style={{ display: "flex", gap: "var(--space-2, 8px)", marginTop: "4px" }}>
            <button
              type="button"
              data-testid="wizard-mode-legal"
              aria-pressed={state.mode === "legal"}
              onClick={() => setState((s) => ({ ...s, mode: "legal", flavor: null }))}
            >
              Legal
            </button>
            <button
              type="button"
              data-testid="wizard-mode-general"
              aria-pressed={state.mode === "general"}
              onClick={() => setState((s) => ({ ...s, mode: "general", flavor: s.flavor ?? "personal" }))}
            >
              General
            </button>
          </div>
        </label>
      </section>
      {state.mode === "general" ? (
        <section style={{ marginTop: "var(--space-3, 12px)" }}>
          <label style={{ display: "block", fontSize: "var(--font-size-sm, 13px)" }}>
            Flavor
            <div style={{ display: "flex", gap: "var(--space-2, 8px)", marginTop: "4px" }}>
              <button
                type="button"
                data-testid="wizard-flavor-personal"
                aria-pressed={state.flavor === "personal"}
                onClick={() => setState((s) => ({ ...s, flavor: "personal" }))}
              >
                Personal
              </button>
              <button
                type="button"
                data-testid="wizard-flavor-academic"
                aria-pressed={state.flavor === "academic"}
                onClick={() => setState((s) => ({ ...s, flavor: "academic" }))}
              >
                Academic
              </button>
            </div>
          </label>
        </section>
      ) : null}
      <section style={{ marginTop: "var(--space-3, 12px)" }}>
        <label style={{ display: "block", fontSize: "var(--font-size-sm, 13px)" }}>
          Title
          <input
            data-testid="wizard-title-input"
            type="text"
            value={state.title}
            onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
            style={{ width: "100%", padding: "4px 8px", marginTop: 4 }}
            autoFocus
          />
        </label>
      </section>
      <section style={{ marginTop: "var(--space-3, 12px)" }}>
        <label style={{ display: "block", fontSize: "var(--font-size-sm, 13px)" }}>
          Description (optional)
          <textarea
            data-testid="wizard-description-input"
            value={state.description}
            onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
            rows={3}
            style={{ width: "100%", padding: "4px 8px", marginTop: 4 }}
          />
        </label>
      </section>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "var(--space-2, 8px)",
          marginTop: "var(--space-4, 16px)",
        }}
      >
        <button type="button" data-testid="wizard-cancel" onClick={props.onCancel}>
          Cancel
        </button>
        <button
          type="button"
          data-testid="wizard-submit"
          disabled={!canSubmit()}
          onClick={handleSubmit}
        >
          Create frame
        </button>
      </div>
    </div>
  );
}
