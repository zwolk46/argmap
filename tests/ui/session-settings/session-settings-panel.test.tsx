// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SessionSettingsPanel } from "@/ui/session-settings";

describe("SessionSettingsPanel", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <SessionSettingsPanel
        open={false}
        on_close={() => {}}
        on_open_frame_settings={() => {}}
        on_delete_session={() => {}}
      />,
    );
    expect(container.querySelector("[data-testid='session-settings-title']")).toBeNull();
  });
});
