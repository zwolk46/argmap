import type { ReactElement } from "react";
import { SignOut } from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "#components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu";
import { useAuth } from "../auth/auth-context";
import { useRepository } from "@/state";
import { useToast } from "../primitives/toast";

/**
 * Top-bar user menu — avatar with the user's initials, dropdown shows the
 * signed-in email and a Sign out action. Replaces the bare SignOutButton
 * to give the chrome a proper account affordance.
 */
export function UserMenu(): ReactElement | null {
  const { user, signOut } = useAuth();
  const { autosave } = useRepository();
  const toast = useToast();
  if (!user) return null;

  const email = user.email ?? "";
  const initials = computeInitials(email);

  async function handle_sign_out() {
    const confirmed = window.confirm(
      "Sign out? Any unsaved edits will be flushed first; if that fails, recent changes may be lost.",
    );
    if (!confirmed) return;
    try {
      await autosave.flushAll();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Couldn't save pending edits before sign-out.";
      toast.push({ kind: "error", message: `Sign-out flush failed: ${message}` });
      return;
    }
    void signOut();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={email ? `Account menu (${email})` : "Account menu"}
        title={email ? `Signed in as ${email}` : "Account menu"}
      >
        <Avatar className="size-8 cursor-pointer transition-opacity hover:opacity-85">
          <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Signed in as
            </span>
            <span className="truncate text-sm font-medium">{email || "your account"}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handle_sign_out}>
          <SignOut />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function computeInitials(email: string): string {
  if (!email) return "?";
  const local = email.split("@")[0];
  if (!local) return "?";
  // Split on non-alphanumeric for "first.last" or "first_last" addresses.
  const parts = local.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (parts.length === 0) return local.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
