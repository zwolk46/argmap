#!/usr/bin/env node
/**
 * Worktree env sync.
 *
 * When `npm run dev` runs inside a `.claude/worktrees/<name>` worktree,
 * Vite reads `.env.local` from the worktree's cwd — not from the primary
 * checkout. Without this script, every fresh worktree boots into the
 * Supabase config-missing error until the user manually copies the env
 * file in.
 *
 * This script runs as the `predev` step. If we are in a worktree AND
 * `.env.local` is absent here BUT present in the primary checkout, copy
 * it across. The file stays git-ignored (.gitignore lists `.env.local`),
 * so the copy is local-only.
 *
 * No-op when running from the primary checkout, or when the worktree
 * already has its own `.env.local`.
 */
import { existsSync, copyFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { execSync } from "node:child_process";

const cwd = process.cwd();
const localEnv = join(cwd, ".env.local");

if (existsSync(localEnv)) {
  process.exit(0);
}

// `git rev-parse --git-common-dir` returns the shared .git directory for
// worktrees. In the primary repo it's `.git`; in a worktree it's the
// absolute path to the primary repo's `.git`. We use that to locate the
// primary checkout.
let primaryGitDir;
try {
  primaryGitDir = execSync("git rev-parse --git-common-dir", {
    cwd,
    encoding: "utf8",
  }).trim();
} catch {
  // Not a git repo or git not available. Nothing to do.
  process.exit(0);
}

const primaryRepoDir = resolve(cwd, dirname(primaryGitDir));
if (primaryRepoDir === cwd) {
  // We are already in the primary checkout. The user is expected to
  // create .env.local manually here per SETUP.md.
  process.exit(0);
}

const primaryEnv = join(primaryRepoDir, ".env.local");
if (!existsSync(primaryEnv)) {
  // No env file anywhere. Vite will boot, the app will surface the
  // SupabaseConfigError, and the user gets SETUP.md guidance.
  process.exit(0);
}

copyFileSync(primaryEnv, localEnv);
console.log(`[sync-worktree-env] copied .env.local from ${primaryRepoDir}`);
