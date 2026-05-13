import React from "react";
import ReactDOM from "react-dom/client";
import type { LlmSettings } from "@/schema";
import {
  IndexedDbRepository,
  createAutosaveController,
  createCrossTabBus,
} from "@/persistence";
import { frameActions, sessionActions } from "@/modes";
import { App } from "./App";

const repo = new IndexedDbRepository();
const autosave = createAutosaveController({ repo });
const crosstab = createCrossTabBus();

void repo.openOrUpgrade();

const llm_settings_default: LlmSettings = {
  build_time_hooks_enabled: false,
  runtime_hooks_enabled: false,
  output_time_hooks_enabled: false,
  invocations: [],
};

const now = (): string => new Date().toISOString();
const generateId = (): string => crypto.randomUUID();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App
      repo={repo}
      autosave={autosave}
      crosstab={crosstab}
      frame_dispatch={frameActions}
      session_dispatch={sessionActions}
      llm_settings_default={llm_settings_default}
      now={now}
      generateId={generateId}
    />
  </React.StrictMode>,
);
