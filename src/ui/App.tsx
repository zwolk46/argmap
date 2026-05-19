import type { ReactElement } from "react";
import { RepositoryProvider } from "@/state";
import type { RepositoryProviderProps } from "@/state";
import { RouterProvider } from "./routing";
import { TooltipProvider } from "./primitives/tooltip";
import { ToastProvider } from "./primitives/toast";
import { AppRoutes } from "./app-routes";
import { SaveFailureToastBridge } from "./save-failure-toast-bridge";

// CSS (tokens, global, react-flow) is loaded by src/main.tsx so design
// tokens are available to AppErrorBoundary, BootError, AuthGate, and
// SignInScreen — every pre-App surface that may render before <App> mounts.
// AppErrorBoundary itself is also lifted to main.tsx so it catches errors
// in AuthProvider / AuthGate / SignInScreen / SignedInApp factories.

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AppProps extends Omit<RepositoryProviderProps, "children"> {}

export function App(props: AppProps): ReactElement {
  return (
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
  );
}
