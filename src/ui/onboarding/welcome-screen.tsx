import type { ReactElement } from "react";
import { Button } from "../primitives";

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
      body: "Save milestones. Compare versions. Migrate sessions across frame revisions.",
    },
  ],
  start_label: "Start guided first frame",
  skip_label: "Skip introduction",
} as const;

export function WelcomeScreen(props: WelcomeScreenProps): ReactElement {
  return (
    <div
      data-testid="welcome-screen"
      style={{
        padding: "var(--space-6)",
        maxWidth: 560,
      }}
    >
      <h2
        style={{
          fontSize: "var(--font-size-xl)",
          fontWeight: "var(--font-weight-semibold)",
          margin: 0,
          color: "var(--color-text-primary)",
          letterSpacing: "var(--letter-spacing-tight)",
          lineHeight: "var(--line-height-tight)",
        }}
      >
        {WELCOME_SCREEN_COPY.title}
      </h2>
      <p
        style={{
          fontSize: "var(--font-size-base)",
          color: "var(--color-text-secondary)",
          marginTop: "var(--space-2)",
          lineHeight: "var(--line-height-normal)",
        }}
      >
        {WELCOME_SCREEN_COPY.subtitle}
      </p>
      <div style={{ marginTop: "var(--space-5)" }}>
        {WELCOME_SCREEN_COPY.sections.map((s) => (
          <section
            key={s.heading}
            style={{
              marginBottom: "var(--space-4)",
              paddingLeft: "var(--space-3)",
              borderLeft: "var(--border-medium) solid var(--color-mode-current-accent-bg)",
            }}
          >
            <h3
              style={{
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-text-primary)",
                margin: 0,
              }}
            >
              {s.heading}
            </h3>
            <p
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-secondary)",
                margin: "var(--space-1) 0 0",
                lineHeight: "var(--line-height-normal)",
              }}
            >
              {s.body}
            </p>
          </section>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          justifyContent: "flex-end",
          marginTop: "var(--space-5)",
          paddingTop: "var(--space-4)",
          borderTop: "var(--border-hairline) solid var(--color-border-subtle)",
        }}
      >
        <Button variant="ghost" data-testid="welcome-skip" onClick={props.onSkip}>
          {WELCOME_SCREEN_COPY.skip_label}
        </Button>
        <Button variant="primary" data-testid="welcome-start" onClick={props.onStart}>
          {WELCOME_SCREEN_COPY.start_label}
        </Button>
      </div>
    </div>
  );
}
