import type { ReactElement } from "react";
import { RepositoryProvider } from "@/state";
import type { RepositoryProviderProps } from "@/state";
import { RouterProvider } from "./routing";
import { AppErrorBoundary } from "./error-boundary";
import { TooltipProvider } from "./primitives/tooltip";
import { ToastProvider } from "./primitives/toast";
import { AppRoutes } from "./app-routes";
import { SaveFailureToastBridge } from "./save-failure-toast-bridge";
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
            <ToastProvider>
              <SaveFailureToastBridge />
              <AppRoutes />
            </ToastProvider>
          </TooltipProvider>
        </RouterProvider>
      </RepositoryProvider>
    </AppErrorBoundary>
  );
}
