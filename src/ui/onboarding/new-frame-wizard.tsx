import * as React from "react";
import type { ReactElement } from "react";
import type { Mode, Flavor } from "@/schema";
import { Button } from "../primitives";

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
      flavor: state.mode === "general" ? (state.flavor ?? "personal") : undefined,
    });
  }

  return (
    <div
      data-testid="new-frame-wizard"
      style={{
        padding: "var(--space-5) var(--space-6) var(--space-5)",
        maxWidth: 520,
      }}
    >
      <h2
        style={{
          fontSize: "var(--font-size-lg)",
          fontWeight: "var(--font-weight-semibold)",
          letterSpacing: "var(--letter-spacing-tight)",
          margin: 0,
        }}
      >
        Create your first frame
      </h2>
      <p
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-secondary)",
          marginTop: "var(--space-1)",
          lineHeight: "var(--line-height-normal)",
        }}
      >
        Frames are reusable argument skeletons. Pick the mode that matches your work.
      </p>

      <Section title="Mode">
        <Choice
          options={[
            {
              value: "legal",
              label: "Legal",
              testid: "wizard-mode-legal",
              hint: "Appellate, statutory, trial preparation.",
            },
            {
              value: "general",
              label: "General",
              testid: "wizard-mode-general",
              hint: "Academic argument mapping, structured analytical work.",
            },
          ]}
          value={state.mode ?? ""}
          onChange={(v) =>
            setState((s) => ({
              ...s,
              mode: v as Mode,
              flavor: v === "general" ? (s.flavor ?? "personal") : null,
            }))
          }
        />
      </Section>

      {state.mode === "general" ? (
        <Section title="Flavor">
          <Choice
            options={[
              {
                value: "personal",
                label: "Personal",
                testid: "wizard-flavor-personal",
                hint: "Analytical personal questions warranting fully fleshed-out logical work.",
              },
              {
                value: "academic",
                label: "Academic",
                testid: "wizard-flavor-academic",
                hint: "Philosophy, policy, theory.",
              },
            ]}
            value={state.flavor ?? ""}
            onChange={(v) => setState((s) => ({ ...s, flavor: v as Flavor }))}
          />
        </Section>
      ) : null}

      <Section title="Title">
        <input
          data-testid="wizard-title-input"
          type="text"
          value={state.title}
          onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
          className="argmap-input"
          autoFocus
          placeholder="e.g. Smith v. Jones — appellate brief"
        />
      </Section>

      <Section title="Description" optional>
        <textarea
          data-testid="wizard-description-input"
          value={state.description}
          onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
          rows={3}
          className="argmap-input"
          placeholder="Optional notes about the question this frame answers."
          style={{ resize: "vertical", lineHeight: "var(--line-height-normal)" }}
        />
      </Section>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "var(--space-2)",
          marginTop: "var(--space-5)",
          paddingTop: "var(--space-4)",
          borderTop: "var(--border-hairline) solid var(--color-border-subtle)",
        }}
      >
        <Button variant="ghost" data-testid="wizard-cancel" onClick={props.onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          data-testid="wizard-submit"
          disabled={!canSubmit()}
          onClick={handleSubmit}
        >
          Create frame
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  optional,
  children,
}: {
  title: string;
  optional?: boolean;
  children: React.ReactNode;
}): ReactElement {
  return (
    <section style={{ marginTop: "var(--space-4)" }}>
      <label
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--space-2)",
          marginBottom: "var(--space-2)",
          fontSize: "var(--font-size-xs)",
          fontWeight: "var(--font-weight-medium)",
          color: "var(--color-text-secondary)",
          letterSpacing: "var(--letter-spacing-wide)",
          textTransform: "uppercase",
        }}
      >
        {title}
        {optional ? (
          <span
            style={{
              fontSize: "var(--font-size-2xs)",
              color: "var(--color-text-tertiary)",
              fontWeight: "var(--font-weight-regular)",
              letterSpacing: "var(--letter-spacing-normal)",
              textTransform: "none",
            }}
          >
            (optional)
          </span>
        ) : null}
      </label>
      {children}
    </section>
  );
}

function Choice({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: string; label: string; testid?: string; hint?: string }>;
  value: string;
  onChange: (next: string) => void;
}): ReactElement {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-pressed={active}
            data-testid={opt.testid}
            onClick={() => onChange(opt.value)}
            style={{
              textAlign: "left",
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: active
                ? "var(--border-medium) solid var(--color-mode-current-accent)"
                : "var(--border-thin) solid var(--color-border-default)",
              background: active
                ? "var(--color-mode-current-accent-bg)"
                : "var(--color-surface-elevated)",
              color: "var(--color-text-primary)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-1)",
              transition:
                "border-color var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard)",
            }}
          >
            <span
              style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-sm)" }}
            >
              {opt.label}
            </span>
            {opt.hint ? (
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-secondary)",
                  lineHeight: "var(--line-height-snug)",
                }}
              >
                {opt.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
