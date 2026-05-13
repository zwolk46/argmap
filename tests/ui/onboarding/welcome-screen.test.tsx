// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { WelcomeScreen, WELCOME_SCREEN_COPY } from "@/ui/onboarding";

describe("WelcomeScreen", () => {
  it("renders the canonical title", () => {
    const { getByText } = render(<WelcomeScreen onStart={() => {}} onSkip={() => {}} />);
    expect(getByText(WELCOME_SCREEN_COPY.title)).toBeTruthy();
  });

  it("renders all three sections", () => {
    const { getByText } = render(<WelcomeScreen onStart={() => {}} onSkip={() => {}} />);
    for (const s of WELCOME_SCREEN_COPY.sections) {
      expect(getByText(s.heading)).toBeTruthy();
    }
  });

  it("Start fires onStart", () => {
    const onStart = vi.fn();
    const { getByTestId } = render(<WelcomeScreen onStart={onStart} onSkip={() => {}} />);
    fireEvent.click(getByTestId("welcome-start"));
    expect(onStart).toHaveBeenCalled();
  });

  it("Skip fires onSkip", () => {
    const onSkip = vi.fn();
    const { getByTestId } = render(<WelcomeScreen onStart={() => {}} onSkip={onSkip} />);
    fireEvent.click(getByTestId("welcome-skip"));
    expect(onSkip).toHaveBeenCalled();
  });
});
