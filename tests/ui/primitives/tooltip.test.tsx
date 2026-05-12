// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { Tooltip, TooltipProvider } from "@/ui/primitives/tooltip";

function WrappedTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider>
      <Tooltip content={<span>{content}</span>}>
        <button data-testid="trigger">hover me</button>
      </Tooltip>
    </TooltipProvider>
  );
}

describe("Tooltip", () => {
  it("tooltip content is not visible initially", () => {
    const { queryByText } = render(<WrappedTooltip content="tooltip text" />);
    expect(queryByText("tooltip text")).toBeNull();
  });

  it("shows content on mouseenter", () => {
    const { getByTestId, getByText } = render(<WrappedTooltip content="hover content" />);
    fireEvent.mouseEnter(getByTestId("trigger"), { clientX: 100, clientY: 100 });
    expect(getByText("hover content")).toBeTruthy();
  });

  it("closes on mouseleave", () => {
    const { getByTestId, queryByText } = render(<WrappedTooltip content="leave test" />);
    fireEvent.mouseEnter(getByTestId("trigger"), { clientX: 100, clientY: 100 });
    fireEvent.mouseLeave(getByTestId("trigger"));
    expect(queryByText("leave test")).toBeNull();
  });

  it("closes on Escape key", () => {
    const { getByTestId, queryByText } = render(<WrappedTooltip content="esc test" />);
    fireEvent.mouseEnter(getByTestId("trigger"), { clientX: 100, clientY: 100 });
    fireEvent.keyDown(getByTestId("trigger"), { key: "Escape" });
    expect(queryByText("esc test")).toBeNull();
  });

  it("opens on focus", () => {
    const { getByTestId, getByText } = render(<WrappedTooltip content="focus content" />);
    fireEvent.focus(getByTestId("trigger"));
    expect(getByText("focus content")).toBeTruthy();
  });

  it("closes on blur", () => {
    const { getByTestId, queryByText } = render(<WrappedTooltip content="blur content" />);
    fireEvent.focus(getByTestId("trigger"));
    fireEvent.blur(getByTestId("trigger"));
    expect(queryByText("blur content")).toBeNull();
  });
});
