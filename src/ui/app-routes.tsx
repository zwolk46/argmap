import type { ReactElement } from "react";
import { useRoute } from "./routing";
import { FrameBuildingPage, ArgumentRunningPage } from "./pages";

function HomePage(): ReactElement {
  return (
    <main
      data-testid="home-page"
      style={{
        padding: "var(--space-6)",
        fontFamily: "var(--font-sans)",
        color: "var(--color-text-primary)",
        background: "var(--color-surface-canvas)",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: "var(--font-size-xl)",
          fontWeight: "var(--font-weight-semibold)",
          margin: "0 0 var(--space-3)",
        }}
      >
        argmap
      </h1>
      <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)" }}>
        Select a frame to begin argument mapping.
      </p>
    </main>
  );
}

export function AppRoutes(): ReactElement {
  const route = useRoute();

  switch (route.kind) {
    case "frame_building":
      return <FrameBuildingPage frame_id={route.frame_id} />;
    case "argument_running":
      return <ArgumentRunningPage session_id={route.session_id} />;
    case "home":
    default:
      return <HomePage />;
  }
}
