import type { ReactElement } from "react";
import { IconButton } from "../primitives/icon-button";
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
      <svg
        width={16}
        height={16}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6.5 2.5h-3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3" />
        <path d="M10 5.5 12.5 8 10 10.5" />
        <path d="M12.5 8H6" />
      </svg>
    </IconButton>
  );
}
