import type { ReactElement } from "react";
import { Button } from "#components/ui/button";

export interface WelcomeScreenProps {
  onStart: () => void;
  onSkip: () => void;
}

export const WELCOME_SCREEN_COPY = {
  title: "Argument mapping that separates structure from substance.",
  subtitle:
    "Build the logical skeleton of an argument once. Run it as many times as you need with different facts and authorities.",
  sections: [
    {
      heading: "Build a frame",
      body: "Construct the logical skeleton of an argument: questions, terms, gates, conclusions.",
    },
    {
      heading: "Run a session",
      body: "Attach premises to the frame to make it sound. Trace conclusions from the inputs.",
    },
    {
      heading: "Reuse and refine",
      body: "Save snapshots, compare versions, and carry sessions forward when a frame changes.",
    },
  ],
  start_label: "Create your first frame",
  skip_label: "Skip introduction",
} as const;

export function WelcomeScreen(props: WelcomeScreenProps): ReactElement {
  return (
    <div data-testid="welcome-screen" className="max-w-[560px] p-6">
      <h2 className="m-0 text-xl font-semibold leading-tight tracking-tight text-[var(--color-text-primary)]">
        {WELCOME_SCREEN_COPY.title}
      </h2>
      <p className="mt-2 text-base leading-normal text-[var(--color-text-secondary)]">
        {WELCOME_SCREEN_COPY.subtitle}
      </p>
      <div className="mt-5">
        {WELCOME_SCREEN_COPY.sections.map((s) => (
          <section
            key={s.heading}
            className="mb-4 border-l-2 border-[var(--color-mode-current-accent-bg)] pl-3"
          >
            <h3 className="m-0 text-sm font-semibold text-[var(--color-text-primary)]">
              {s.heading}
            </h3>
            <p className="mt-1 text-sm leading-normal text-[var(--color-text-secondary)]">
              {s.body}
            </p>
          </section>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-4">
        <Button variant="ghost" data-testid="welcome-skip" onClick={props.onSkip}>
          {WELCOME_SCREEN_COPY.skip_label}
        </Button>
        <Button variant="default" data-testid="welcome-start" onClick={props.onStart}>
          {WELCOME_SCREEN_COPY.start_label}
        </Button>
      </div>
    </div>
  );
}
