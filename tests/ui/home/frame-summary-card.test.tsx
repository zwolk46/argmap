// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { FrameSummaryCard, relativeTime } from "@/ui/home";
import type { FrameId } from "@/schema";

describe("relativeTime", () => {
  it("returns empty for empty input", () => {
    expect(relativeTime("")).toBe("");
  });

  it("returns 'Ns ago' for fresh timestamps", () => {
    const iso = new Date(Date.now() - 5000).toISOString();
    expect(relativeTime(iso)).toMatch(/s ago$/);
  });

  it("returns 'Nm ago' for several minutes old", () => {
    const iso = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    expect(relativeTime(iso)).toMatch(/m ago$/);
  });
});

describe("FrameSummaryCard", () => {
  const summary = {
    id: "f1" as FrameId,
    title: "My Frame",
    mode: "legal" as const,
    pinned: false,
    updated_at: new Date(Date.now() - 1000).toISOString(),
  };

  it("renders title", () => {
    const { getByText } = render(
      <FrameSummaryCard summary={summary} onOpen={() => {}} onTogglePin={() => {}} />,
    );
    expect(getByText("My Frame")).toBeTruthy();
  });

  it("opens with click on title button", () => {
    const onOpen = vi.fn();
    const { getByTestId } = render(
      <FrameSummaryCard summary={summary} onOpen={onOpen} onTogglePin={() => {}} />,
    );
    fireEvent.click(getByTestId("frame-card-open"));
    expect(onOpen).toHaveBeenCalledWith("f1");
  });

  it("toggles pin with the right next state", () => {
    const onTogglePin = vi.fn();
    const { getByTestId } = render(
      <FrameSummaryCard
        summary={{ ...summary, pinned: false }}
        onOpen={() => {}}
        onTogglePin={onTogglePin}
      />,
    );
    fireEvent.click(getByTestId("frame-card-pin"));
    expect(onTogglePin).toHaveBeenCalledWith("f1", true);
  });

  it("pin button shows ★ when pinned, ☆ otherwise", () => {
    const { getByTestId, rerender } = render(
      <FrameSummaryCard summary={summary} onOpen={() => {}} onTogglePin={() => {}} />,
    );
    expect(getByTestId("frame-card-pin").textContent).toBe("☆");
    rerender(
      <FrameSummaryCard
        summary={{ ...summary, pinned: true }}
        onOpen={() => {}}
        onTogglePin={() => {}}
      />,
    );
    expect(getByTestId("frame-card-pin").textContent).toBe("★");
  });
});
