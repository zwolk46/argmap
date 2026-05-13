import type { ReactElement } from "react";

export interface WelcomeScreenProps {
  onStart: () => void;
  onSkip: () => void;
}

export const WELCOME_SCREEN_COPY = {
  title: "Welcome to argmap",
  subtitle: "Map arguments. Trace conclusions to their premises. Test soundness.",
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
      style={{ padding: "var(--space-5, 20px)", maxWidth: 520 }}
    >
      <h2
        style={{
          fontSize: "var(--font-size-xl, 20px)",
          fontWeight: 500,
          margin: 0,
        }}
      >
        {WELCOME_SCREEN_COPY.title}
      </h2>
      <p
        style={{
          fontSize: "var(--font-size-base, 14px)",
          color: "var(--color-text-secondary, #6b7280)",
          marginTop: "var(--space-1, 4px)",
        }}
      >
        {WELCOME_SCREEN_COPY.subtitle}
      </p>
      <div style={{ marginTop: "var(--space-4, 16px)" }}>
        {WELCOME_SCREEN_COPY.sections.map((s) => (
          <section key={s.heading} style={{ marginBottom: "var(--space-3, 12px)" }}>
            <h3
              style={{
                fontSize: "var(--font-size-sm, 13px)",
                fontWeight: 500,
                margin: 0,
              }}
            >
              {s.heading}
            </h3>
            <p
              style={{
                fontSize: "var(--font-size-sm, 13px)",
                color: "var(--color-text-secondary, #6b7280)",
                margin: "var(--space-1, 4px) 0 0",
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
          gap: "var(--space-2, 8px)",
          justifyContent: "flex-end",
          marginTop: "var(--space-4, 16px)",
        }}
      >
        <button type="button" data-testid="welcome-skip" onClick={props.onSkip}>
          {WELCOME_SCREEN_COPY.skip_label}
        </button>
        <button
          type="button"
          data-testid="welcome-start"
          onClick={props.onStart}
          style={{
            background: "var(--color-mode-current-accent, #1d4ed8)",
            color: "var(--color-text-on-accent, #ffffff)",
            border: "none",
            borderRadius: "var(--radius-md, 6px)",
            padding: "var(--space-2, 8px) var(--space-4, 16px)",
            cursor: "pointer",
          }}
        >
          {WELCOME_SCREEN_COPY.start_label}
        </button>
      </div>
    </div>
  );
}
