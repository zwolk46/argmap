import type { ReactElement } from "react";
import { IconButton } from "../primitives/icon-button";
import { UIcon } from "../primitives/uicon";
import { useAuth } from "../auth/auth-context";
import { useRepository } from "@/state";

/**
 * Compact sign-out affordance in the top bar. Renders only when the user
 * is authenticated.
 */
export function SignOutButton(): ReactElement | null {
  const { user, signOut } = useAuth();
  const { autosave } = useRepository();
  if (!user) return null;
  return (
    <IconButton
      aria-label={`Sign out (${user.email ?? "signed in"})`}
      title={`Signed in as ${user.email ?? "user"} — click to sign out`}
      onClick={async () => {
        // Flush any pending debounce before tearing down the session.
        // Without this, an edit made in the last 5s of an active session
        // is discarded when the user clicks sign-out — the per-user
        // repository unmounts before autosave's idle timer fires.
        try {
          await autosave.flushAll();
        } catch {
          // Swallow — we still want to sign out even if the flush fails.
        }
        void signOut();
      }}
    >
      <UIcon name="sign-out-alt" size={18} />
    </IconButton>
  );
}
