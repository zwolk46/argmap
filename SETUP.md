# argmap — Supabase setup

Wave F replaced the browser-local IndexedDB persistence with **Supabase** (Postgres + Auth). You'll need to provision a Supabase project and connect it to Vercel **once**; after that, every deployment auto-picks up the right environment variables.

This guide is for a non-coder. Total time: ~10 minutes.

---

## 1. Install the Vercel Marketplace Supabase integration (3 minutes)

1. Open the Vercel dashboard for your `argmap` project: https://vercel.com/zachs-projects-74dd78e7/argmap
2. Click **Storage** in the project sidebar.
3. Click **Browse Marketplace** → search "Supabase" → click **Add Integration**.
4. When prompted:
   - **Project to connect:** select `argmap`.
   - **Region:** pick the one closest to you (US East is fine for most).
   - **Project name:** something like `argmap-prod`.
5. Click **Continue** and walk through Supabase's signup if this is your first project.

**What this does:** auto-creates a Supabase project, generates the API URL + anon key, and sets these env vars on every Vercel deployment automatically:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL                  (alias)
SUPABASE_ANON_KEY             (alias)
SUPABASE_SERVICE_ROLE_KEY     (server-only; unused in this app)
SUPABASE_JWT_SECRET           (server-only; unused in this app)
```

You can confirm by going to Vercel project → **Settings** → **Environment Variables**.

---

## 2. Run the schema SQL (2 minutes)

1. From the Vercel integration screen, click **Open in Supabase** (or visit https://supabase.com/dashboard and pick the new project).
2. In the Supabase dashboard, click **SQL Editor** in the left sidebar.
3. Click **+ New query**.
4. Open `supabase/schema.sql` from this repo, copy the entire file, paste into the SQL editor, and click **Run** (or press Cmd/Ctrl + Enter).
5. You should see "Success. No rows returned." This created 6 tables and 24 RLS policies.

The script is idempotent. Safe to re-run if you change something.

---

## 3. Configure Auth in Supabase (1 minute)

By default, Supabase requires email confirmation before sign-in works. For development/single-user use you may want to disable that:

1. In Supabase dashboard → **Authentication** → **Providers** → **Email**.
2. (Optional) Toggle **Confirm email** OFF. This lets you sign in immediately after sign-up. Re-enable later if you ever invite collaborators.

Email/password is the only auth method this app uses (per the choice you made at the start of Wave F). Don't enable other providers unless you've added UI for them.

---

## 4. Deploy + sign in (2 minutes)

1. Trigger a new deployment on Vercel (push to `main` or click **Redeploy**). The new build will pick up the Supabase env vars automatically.
2. Visit your deployed URL. You should see the sign-in screen.
3. Click **Create one** → enter your email and a password (≥8 chars).
4. (If you didn't disable email confirmation in step 3:) check your email, click the confirmation link, return to the app.
5. Sign in. You should land on the empty Home page.

---

## 5. Local development (optional)

If you want to run `npm run dev` locally against the same Supabase project:

1. Create `.env.local` in the repo root (already in `.gitignore`).
2. Add these two lines (values from Supabase dashboard → **Project Settings** → **API**):

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

3. `npm run dev`. Same sign-in flow as production.

---

## Troubleshooting

**"argmap couldn't start: Missing Supabase env vars"**
The Vercel integration didn't set the env vars, or you forgot to redeploy. Check Vercel → Settings → Environment Variables for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Both must be present in Production. Redeploy.

**Sign-in says "Invalid login credentials"**
Either the email is unconfirmed (step 3 — confirm in your inbox or disable email confirmation in Supabase), or the password is wrong.

**Empty Home page after sign-in**
That's expected on first sign-in. Click **+ New frame** to create your first frame.

**"AppState singleton missing"**
This is a one-time error on first sign-in; argmap auto-seeds a default AppState the next time you do anything (pin a frame, dismiss a coachmark, etc.). It shouldn't reach the user — the loadAppState path catches it.

**My frames don't show up on my phone**
Sign in with the same email on both devices. Each Supabase user owns their own data via Row-Level Security; signing in as the same user surfaces the same rows.

---

## What's NOT in v1

- **Password reset** — Supabase supports it (Auth → Magic Link or Reset Password email) but the app doesn't expose a "forgot password" link yet. For now, use the Supabase dashboard to manually trigger a reset email.
- **Account deletion** — Same.
- **Email change** — Same.
- **OAuth / magic-link sign-in** — could be added by toggling providers in Supabase and adding UI buttons; out of scope for Wave F.
- **Realtime sync between concurrent tabs** — Wave D's BroadcastChannel handles same-browser; cross-device sync requires Supabase Realtime subscriptions (a future hardening pass).
