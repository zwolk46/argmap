import type { ReactElement } from "react";
import { IconButton } from "../primitives/icon-button";
import { UIcon } from "../primitives/uicon";
import { useAuth } from "../auth/auth-context";
import { useRepository } from "@/state";
import { useToast } from "../primitives/toast";

/**
 * Compact sign-out affordance in the top bar. Renders only when the user
 * is authenticated.
 */
export function SignOutButton(): ReactElement | null {
  const { user, signOut } = useAuth();
  const { autosave } = useRepository();
  const toast = useToast();
  if (!user) return null;
  return (
    <IconButton
      // §9 #10: omit the parenthetical entirely when there's no email rather
      // than reading "Sign out (signed in)" — the original fallback was usable
      // but jarring; "Sign out" alone is correct when we have nothing to add.
      aria-label={user.email ? `Sign out (${user.email})` : "Sign out"}
      title={`Signed in as ${user.email ?? "your account"} — click to sign out`}
      onClick={async () => {
        // §9 #6 — confirm before signing out so a stray click doesn't tear
        // down the session and any in-flight edits.
        const confirmed = window.confirm(
          "Sign out? Any unsaved edits will be flushed first; if that fails, recent changes may be lost.",
        );
        if (!confirmed) return;
        try {
          // Flush any pending debounce before tearing down the session.
          // Without this, an edit made in the last 5s of an active session
          // is discarded when the user clicks sign-out — the per-user
          // repository unmounts before autosave's idle timer fires.
          await autosave.flushAll();
        } catch (e: unknown) {
          const message =
            e instanceof Error ? e.message : "Couldn't save pending edits before sign-out.";
          // Surface the flush failure instead of swallowing it; the user
          // can re-try or copy their work before continuing.
          toast.push({ kind: "error", message: `Sign-out flush failed: ${message}` });
          return;
        }
        void signOut();
      }}
    >
      <UIcon name="sign-out-alt" size={18} />
    </IconButton>
  );
}
