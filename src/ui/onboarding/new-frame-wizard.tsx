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
  // `start_at_template_step` was declared on this surface for a planned
  // "New frame from template" entry point. The template flow itself ships
  // in v1.5 (see Open questions in current_state.html); the prop was never
  // read by any component. Removed to stop hinting at unbuilt functionality.
}

interface WizardState {
  mode: Mode | null;
  flavor: Flavor | null;
  title: string;
  description: string;
}

export const WIZARD_STEP_TITLES = ["Mode", "Flavor", "Details"] as const;

// Bound title length client-side so a multi-KB paste doesn't become the
// frame title (which propagates to tiles, breadcrumbs, search index, and
// may later fail DB column-length checks). 200 chars comfortably fits the
// longest sensible legal/citation phrasings.
const TITLE_MAX_LENGTH = 200;

export function NewFrameWizard(props: NewFrameWizardProps): ReactElement {
  const [state, setState] = React.useState<WizardState>({
    mode: null,
    flavor: null,
    title: "",
    description: "",
  });
  const title_counter_id = React.useId();
  const counter_visible = state.title.length > TITLE_MAX_LENGTH * 0.8;

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
          required
          aria-required="true"
          maxLength={TITLE_MAX_LENGTH}
          aria-describedby={counter_visible ? title_counter_id : undefined}
          placeholder="e.g. Smith v. Jones — appellate brief"
        />
        {counter_visible ? (
          <p
            id={title_counter_id}
            data-testid="wizard-title-counter"
            style={{
              marginTop: "var(--space-1)",
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-tertiary)",
            }}
          >
            {state.title.length} / {TITLE_MAX_LENGTH}
          </p>
        ) : null}
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
        className="argmap-section-heading"
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--space-2)",
          marginBottom: "var(--space-2)",
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
  // ARIA radiogroup: container carries role=radiogroup; only the checked
  // option is in the tab order so the group is one tab stop, then arrow
  // keys move within it. aria-checked (not aria-pressed) is the right
  // attribute for radio semantics.
  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (
      e.key !== "ArrowRight" &&
      e.key !== "ArrowDown" &&
      e.key !== "ArrowLeft" &&
      e.key !== "ArrowUp"
    ) {
      return;
    }
    e.preventDefault();
    const idx = options.findIndex((o) => o.value === value);
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const next = idx === -1 ? 0 : (idx + dir + options.length) % options.length;
    onChange(options[next].value);
  }
  return (
    <div
      role="radiogroup"
      onKeyDown={handleKey}
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        // Roving tabindex: if nothing is selected yet, the first option is
        // focusable so keyboard users can enter the group.
        const tab_index = active || (value === "" && opt === options[0]) ? 0 : -1;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={tab_index}
            data-testid={opt.testid}
            onClick={() => onChange(opt.value)}
            data-active={active ? "true" : "false"}
            className="argmap-radio-card"
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
