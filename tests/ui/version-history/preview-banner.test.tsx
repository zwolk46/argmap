// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { PreviewBanner } from "@/ui/version-history/preview-banner";
import {
  VersionHistoryPreviewProvider,
  useVersionHistoryPreview,
} from "@/ui/version-history/preview-context";
import * as React from "react";

describe("PreviewBanner", () => {
  it("frame variant renders 'Previewing version N (read-only)'", () => {
    const { getByText } = render(
      <VersionHistoryPreviewProvider>
        <PreviewBanner version_number={5} kind="frame" />
      </VersionHistoryPreviewProvider>,
    );
    expect(getByText("Previewing version 5 (read-only)")).toBeTruthy();
  });

  it("session variant renders 'Previewing session version N (read-only)'", () => {
    const { getByText } = render(
      <VersionHistoryPreviewProvider>
        <PreviewBanner version_number={9} kind="session" />
      </VersionHistoryPreviewProvider>,
    );
    expect(getByText("Previewing session version 9 (read-only)")).toBeTruthy();
  });

  it("Exit button transitions preview state back to 'none'", () => {
    function Probe(): React.ReactElement {
      const ctrls = useVersionHistoryPreview();
      React.useEffect(() => {
        ctrls.enterFramePreview({ frame_id: "f", version_id: "v", version_number: 1 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return (
        <>
          <PreviewBanner version_number={1} kind="frame" />
          <span data-testid="probe-state">{ctrls.state.kind}</span>
        </>
      );
    }
    const { getByTestId } = render(
      <VersionHistoryPreviewProvider>
        <Probe />
      </VersionHistoryPreviewProvider>,
    );
    // Sanity: state goes to 'frame' after mount effect
    expect(getByTestId("probe-state").textContent).toBe("frame");
    fireEvent.click(getByTestId("preview-banner-exit"));
    expect(getByTestId("probe-state").textContent).toBe("none");
  });
});
