import type { Frame, FrameVersion } from "./frame";
import type { ArgumentSession, ArgumentSessionVersion } from "./session";

export const CURRENT_APP_VERSION = "1.0.0";

export interface FrameExport {
  schema_version: number;
  app_version: string;
  exported_at: string;
  frame: Frame;
  current_version: FrameVersion;
  history?: FrameVersion[];
}

export interface ArgumentSessionExport {
  schema_version: number;
  app_version: string;
  exported_at: string;
  session: ArgumentSession;
  current_version: ArgumentSessionVersion;
  history?: ArgumentSessionVersion[];
  embedded_frame_export?: FrameExport;
}
