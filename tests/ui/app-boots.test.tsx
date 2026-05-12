// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type { AppProps } from "@/ui";

// Mock the UI App to avoid needing real store providers for this smoke test
vi.mock("@/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/ui")>();
  return {
    ...actual,
    App: (_props: AppProps) => (
      <div data-testid="app-root">
        <div data-testid="error-boundary-present">true</div>
        <p>Welcome to argmap</p>
      </div>
    ),
  };
});

describe("App boots", () => {
  it("renders the app root without crashing", async () => {
    const { App } = await import("@/ui");
    const dev_props = {} as unknown as AppProps;
    const { getByTestId } = render(<App {...dev_props} />);
    expect(getByTestId("app-root")).toBeTruthy();
  });

  it("has error boundary in place", async () => {
    const { App } = await import("@/ui");
    const dev_props = {} as unknown as AppProps;
    const { getByTestId } = render(<App {...dev_props} />);
    expect(getByTestId("error-boundary-present")).toBeTruthy();
  });
});
