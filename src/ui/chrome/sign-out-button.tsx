import type { ReactElement } from "react";
import { IconButton } from "../primitives/icon-button";
import { UIcon } from "../primitives/uicon";
import { useAuth } from "../auth/auth-context";

/**
 * Compact sign-out affordance in the top bar. Renders only when the user
 * is authenticated.
 */
export function SignOutButton(): ReactElement | null {
  const { user, signOut } = useAuth();
  if (!user) return null;
  return (
    <IconButton
      aria-label={`Sign out (${user.email ?? "signed in"})`}
      title={`Signed in as ${user.email ?? "user"} — click to sign out`}
      onClick={() => void signOut()}
    >
      <UIcon name="sign-out-alt" size={18} />
    </IconButton>
  );
}
