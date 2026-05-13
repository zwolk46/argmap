import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Singleton Supabase client. Reads URL + anon key from Vite env vars.
 *
 * Required env vars (auto-provisioned by the Vercel Marketplace Supabase
 * integration; for local dev populate them in `.env.local`):
 *   VITE_SUPABASE_URL        — https://<project>.supabase.co
 *   VITE_SUPABASE_ANON_KEY   — the public anon key (RLS protects per-user data)
 *
 * Throws a configuration error if either is missing rather than failing
 * silently — easier to surface in the BootGate in main.tsx than to debug
 * a "user is null forever" symptom.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export class SupabaseConfigError extends Error {
  constructor(missing: ReadonlyArray<string>) {
    super(
      `Missing Supabase env vars: ${missing.join(", ")}. ` +
        `Install the Supabase marketplace integration on Vercel (auto-sets them), ` +
        `or copy your project's URL + anon key into .env.local for local dev. ` +
        `See SETUP.md.`,
    );
    this.name = "SupabaseConfigError";
  }
}

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push("VITE_SUPABASE_URL");
  if (!SUPABASE_ANON_KEY) missing.push("VITE_SUPABASE_ANON_KEY");
  if (missing.length > 0) throw new SupabaseConfigError(missing);
  _client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Multi-tab: Supabase Auth listens to localStorage events; combined
      // with our CrossTabBus from Wave D this gives us coherent cross-tab
      // state.
      detectSessionInUrl: true,
    },
  });
  return _client;
}
