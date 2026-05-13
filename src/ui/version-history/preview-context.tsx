import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import type { FrameId, SessionId, FrameVersionId, SessionVersionId } from "@/schema";

export type PreviewState =
  | { kind: "none" }
  | { kind: "frame"; frame_id: FrameId; version_id: FrameVersionId; version_number: number }
  | {
      kind: "session";
      session_id: SessionId;
      version_id: SessionVersionId;
      version_number: number;
    };

export interface VersionHistoryPreviewControls {
  state: PreviewState;
  enterFramePreview(args: {
    frame_id: FrameId;
    version_id: FrameVersionId;
    version_number: number;
  }): void;
  enterSessionPreview(args: {
    session_id: SessionId;
    version_id: SessionVersionId;
    version_number: number;
  }): void;
  exit(): void;
}

export class VersionHistoryPreviewProviderMissingError extends Error {
  constructor() {
    super("useVersionHistoryPreview must be used inside <VersionHistoryPreviewProvider>");
    this.name = "VersionHistoryPreviewProviderMissingError";
  }
}

type Action =
  | { type: "enter_frame"; frame_id: FrameId; version_id: FrameVersionId; version_number: number }
  | {
      type: "enter_session";
      session_id: SessionId;
      version_id: SessionVersionId;
      version_number: number;
    }
  | { type: "exit" };

function reducer(_state: PreviewState, action: Action): PreviewState {
  switch (action.type) {
    case "enter_frame":
      return {
        kind: "frame",
        frame_id: action.frame_id,
        version_id: action.version_id,
        version_number: action.version_number,
      };
    case "enter_session":
      return {
        kind: "session",
        session_id: action.session_id,
        version_id: action.version_id,
        version_number: action.version_number,
      };
    case "exit":
      return { kind: "none" };
  }
}

const Ctx = React.createContext<VersionHistoryPreviewControls | null>(null);

export function VersionHistoryPreviewProvider(props: { children: ReactNode }): ReactElement {
  const [state, dispatch] = React.useReducer(reducer, { kind: "none" } as PreviewState);

  const controls = React.useMemo<VersionHistoryPreviewControls>(
    () => ({
      state,
      enterFramePreview: ({ frame_id, version_id, version_number }) =>
        dispatch({ type: "enter_frame", frame_id, version_id, version_number }),
      enterSessionPreview: ({ session_id, version_id, version_number }) =>
        dispatch({ type: "enter_session", session_id, version_id, version_number }),
      exit: () => dispatch({ type: "exit" }),
    }),
    [state],
  );

  return <Ctx.Provider value={controls}>{props.children}</Ctx.Provider>;
}

export function useVersionHistoryPreview(): VersionHistoryPreviewControls {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new VersionHistoryPreviewProviderMissingError();
  return ctx;
}
