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
      <FrameSummaryCard
        summary={summary}
        is_pinned={false}
        onOpen={() => {}}
        onTogglePin={() => {}}
      />,
    );
    expect(getByText("My Frame")).toBeTruthy();
  });

  it("opens with click on title button", () => {
    const onOpen = vi.fn();
    const { getByTestId } = render(
      <FrameSummaryCard
        summary={summary}
        is_pinned={false}
        onOpen={onOpen}
        onTogglePin={() => {}}
      />,
    );
    fireEvent.click(getByTestId("frame-card-open"));
    expect(onOpen).toHaveBeenCalledWith("f1");
  });

  it("toggles pin with the right next state — derives from is_pinned prop, not summary.pinned (P0-14)", () => {
    const onTogglePin = vi.fn();
    const { getByTestId } = render(
      <FrameSummaryCard
        summary={{ ...summary, pinned: false /* stale Frame.pinned */ }}
        is_pinned={false}
        onOpen={() => {}}
        onTogglePin={onTogglePin}
      />,
    );
    fireEvent.click(getByTestId("frame-card-pin"));
    expect(onTogglePin).toHaveBeenCalledWith("f1", true);
  });

  it("unpin path: is_pinned=true → click → next state false", () => {
    const onTogglePin = vi.fn();
    const { getByTestId } = render(
      <FrameSummaryCard
        summary={{ ...summary, pinned: false /* stale Frame.pinned */ }}
        is_pinned={true}
        onOpen={() => {}}
        onTogglePin={onTogglePin}
      />,
    );
    fireEvent.click(getByTestId("frame-card-pin"));
    expect(onTogglePin).toHaveBeenCalledWith("f1", false);
  });

  it("pin button shows ★ when is_pinned, ☆ otherwise (visual derived from is_pinned, not summary.pinned)", () => {
    const { getByTestId, rerender } = render(
      <FrameSummaryCard
        summary={summary}
        is_pinned={false}
        onOpen={() => {}}
        onTogglePin={() => {}}
      />,
    );
    expect(getByTestId("frame-card-pin").textContent).toBe("☆");
    rerender(
      <FrameSummaryCard
        summary={summary /* Frame.pinned stays false */}
        is_pinned={true}
        onOpen={() => {}}
        onTogglePin={() => {}}
      />,
    );
    expect(getByTestId("frame-card-pin").textContent).toBe("★");
  });

  it("regression: stale summary.pinned does NOT control the star (P0-14)", () => {
    const { getByTestId } = render(
      <FrameSummaryCard
        summary={{ ...summary, pinned: true /* stale */ }}
        is_pinned={false /* authoritative */}
        onOpen={() => {}}
        onTogglePin={() => {}}
      />,
    );
    expect(getByTestId("frame-card-pin").textContent).toBe("☆");
  });
});
