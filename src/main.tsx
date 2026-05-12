import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import type { AppProps } from "./App";

// Dev stub — full DI wiring happens in I.10 (persistence + runtime wire-in session).
// The placeholder pages render without any repo calls.
const dev_props = {} as unknown as AppProps;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App {...dev_props} />
  </React.StrictMode>,
);
