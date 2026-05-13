import type { ReactElement } from "react";
import { RepositoryProvider } from "@/state";
import type { RepositoryProviderProps } from "@/state";
import { RouterProvider } from "./routing";
import { AppErrorBoundary } from "./error-boundary";
import { TooltipProvider } from "./primitives/tooltip";
import { AppRoutes } from "./app-routes";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/react-flow.css";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AppProps extends Omit<RepositoryProviderProps, "children"> {}

export function App(props: AppProps): ReactElement {
  return (
    <AppErrorBoundary>
      <RepositoryProvider {...props}>
        <RouterProvider>
          <TooltipProvider>
            <AppRoutes />
          </TooltipProvider>
        </RouterProvider>
      </RepositoryProvider>
    </AppErrorBoundary>
  );
}
