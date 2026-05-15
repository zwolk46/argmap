import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import { Button } from "./primitives";

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // P1: log to the console so production errors are recoverable from
    // browser devtools. Without this, the error boundary swallowed every
    // crash silently — the user saw "Something went wrong" with no way
    // to surface the underlying message.
    console.error("[AppErrorBoundary]", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  override render(): ReactElement | ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: "var(--space-6)",
            fontFamily: "var(--font-sans)",
            color: "var(--color-text-primary)",
            background: "var(--color-surface-canvas)",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            alignItems: "flex-start",
            justifyContent: "center",
            maxWidth: "480px",
            margin: "0 auto",
          }}
        >
          <p
            style={{
              fontSize: "var(--font-size-md)",
              fontWeight: "var(--font-weight-semibold)",
              margin: 0,
            }}
          >
            Something went wrong
          </p>
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-secondary)",
              margin: 0,
            }}
          >
            Reload the application to recover. Your work is auto-saved.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre
              style={{
                fontSize: "var(--font-size-xs)",
                fontFamily: "var(--font-mono)",
                color: "var(--color-severity-error)",
                background: "var(--color-severity-error-bg)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                overflow: "auto",
                maxWidth: "100%",
                margin: 0,
              }}
            >
              {this.state.error.stack ?? this.state.error.message}
            </pre>
          )}
          <Button variant="primary" size="md" onClick={this.handleReload}>
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
