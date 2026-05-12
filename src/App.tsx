import type { ReactElement } from "react";
import { App as UiApp } from "@/ui";
import type { AppProps } from "@/ui";

export type { AppProps };

export function App(props: AppProps): ReactElement {
  return <UiApp {...props} />;
}
