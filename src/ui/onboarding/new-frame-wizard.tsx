import * as React from "react";
import type { ReactElement } from "react";
import { Check } from "@phosphor-icons/react";
import type { Mode, Flavor } from "@/schema";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Textarea } from "#components/ui/textarea";
import { cn } from "#lib/utils";

export interface NewFrameWizardSubmitArgs {
  title: string;
  description?: string;
  mode: Mode;
  flavor?: Flavor;
}

export interface NewFrameWizardProps {
  onSubmit: (args: NewFrameWizardSubmitArgs) => void;
  onCancel: () => void;
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
    <div data-testid="new-frame-wizard" className="max-w-[520px] p-5 sm:px-6">
      <h2 className="m-0 text-lg font-semibold tracking-tight">Create your first frame</h2>
      <p className="mt-1 text-sm leading-normal text-[var(--color-text-secondary)]">
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
              dataMode: "legal",
            },
            {
              value: "general",
              label: "General",
              testid: "wizard-mode-general",
              hint: "Academic argument mapping, structured analytical work.",
              dataMode: "general",
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
                dataFlavor: "personal",
              },
              {
                value: "academic",
                label: "Academic",
                testid: "wizard-flavor-academic",
                hint: "Philosophy, policy, theory.",
                dataFlavor: "academic",
              },
            ]}
            value={state.flavor ?? ""}
            onChange={(v) => setState((s) => ({ ...s, flavor: v as Flavor }))}
          />
        </Section>
      ) : null}

      <Section title="Title">
        <Input
          data-testid="wizard-title-input"
          type="text"
          value={state.title}
          onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
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
            className="mt-1 text-xs text-[var(--color-text-tertiary)]"
          >
            {state.title.length} / {TITLE_MAX_LENGTH}
          </p>
        ) : null}
      </Section>

      <Section title="Description" optional>
        <Textarea
          data-testid="wizard-description-input"
          value={state.description}
          onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
          rows={3}
          placeholder="Optional notes about the question this frame answers."
          className="resize-y leading-normal"
        />
      </Section>

      <div className="mt-5 flex justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-4">
        <Button variant="ghost" data-testid="wizard-cancel" onClick={props.onCancel}>
          Cancel
        </Button>
        <Button
          variant="default"
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
    <section className="mt-4">
      <label className="mb-2 flex items-baseline gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
        {title}
        {optional ? (
          <span className="text-[10px] font-normal normal-case tracking-normal text-[var(--color-text-tertiary)]">
            (optional)
          </span>
        ) : null}
      </label>
      {children}
    </section>
  );
}

interface ChoiceOption {
  value: string;
  label: string;
  testid?: string;
  hint?: string;
  dataMode?: string;
  dataFlavor?: string;
}

function Choice({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<ChoiceOption>;
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
    <div role="radiogroup" onKeyDown={handleKey} className="grid grid-cols-2 gap-2">
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
            data-active={active ? "true" : "false"}
            data-mode={opt.dataMode}
            data-flavor={opt.dataFlavor}
            onClick={() => onChange(opt.value)}
            className={cn(
              "group relative flex cursor-pointer flex-col gap-1 rounded-2xl bg-card p-4 text-left text-card-foreground ring-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "ring-2 ring-[var(--color-mode-current-accent)] bg-[var(--color-mode-current-accent-bg)]"
                : "ring-foreground/10 hover:bg-muted/30",
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                {opt.label}
              </span>
              {active ? (
                <span
                  aria-hidden="true"
                  className="inline-flex size-5 items-center justify-center rounded-full bg-[var(--color-mode-current-accent)] text-[var(--color-mode-current-accent-fg,white)]"
                >
                  <Check size={12} weight="bold" />
                </span>
              ) : null}
            </span>
            {opt.hint ? (
              <span className="text-xs leading-snug text-[var(--color-text-secondary)]">
                {opt.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
