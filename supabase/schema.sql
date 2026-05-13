-- argmap Supabase schema (v1).
--
-- One file the user runs in the Supabase SQL Editor to bring up every
-- table, index, and Row-Level-Security policy this app needs. Idempotent:
-- safe to re-run.
--
-- Mental model: every persisted entity has its full payload stored as
-- JSONB. The argmap runtime expects the same TypeScript shape it would
-- get from IndexedDB; the SupabaseRepository serializes/deserializes
-- entire objects rather than normalizing into columns. This keeps the
-- schema migration story trivial as the in-memory types evolve.
--
-- Auth: every row is owned by an auth.users.id (Supabase Auth). RLS
-- policies enforce that authenticated users see only their own rows.

-- ============================================================================
-- Helpers
-- ============================================================================

-- Returns the authenticated user's UUID, or NULL if anonymous. Wrapping
-- auth.uid() in a function isn't strictly necessary but keeps policy
-- expressions consistent.
CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS uuid AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Tables
-- ============================================================================

-- Frames: the logical-structure header (one row per Frame). The current
-- FrameVersion content lives in frame_versions; this table holds the
-- mode/flavor metadata and a pointer to the current version.
CREATE TABLE IF NOT EXISTS public.frames (
  id            text PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload       jsonb NOT NULL,
  -- Denormalized for fast list queries; kept in sync via SupabaseRepository.
  title         text NOT NULL DEFAULT '',
  updated_at    timestamptz NOT NULL DEFAULT now(),
  archived      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_frames_user_updated ON public.frames (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_frames_user_archived ON public.frames (user_id, archived);

-- FrameVersions: the versioned content. Many-to-one with frames.
CREATE TABLE IF NOT EXISTS public.frame_versions (
  id                  text PRIMARY KEY,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  frame_id            text NOT NULL REFERENCES public.frames(id) ON DELETE CASCADE,
  payload             jsonb NOT NULL,
  -- Denormalized so the version-history pane can avoid loading the whole payload.
  version_number      integer NOT NULL,
  parent_version_id   text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  is_milestone        boolean NOT NULL DEFAULT false,
  change_summary      text
);

CREATE INDEX IF NOT EXISTS idx_frame_versions_user_frame
  ON public.frame_versions (user_id, frame_id, version_number);

-- Sessions: argument-running sessions, each anchored to a FrameVersion snapshot.
CREATE TABLE IF NOT EXISTS public.argument_sessions (
  id            text PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  frame_id      text NOT NULL REFERENCES public.frames(id) ON DELETE CASCADE,
  payload       jsonb NOT NULL,
  title         text NOT NULL DEFAULT '',
  updated_at    timestamptz NOT NULL DEFAULT now(),
  archived      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_frame ON public.argument_sessions (user_id, frame_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_updated
  ON public.argument_sessions (user_id, updated_at DESC);

-- SessionVersions: many-to-one with argument_sessions.
CREATE TABLE IF NOT EXISTS public.argument_session_versions (
  id                  text PRIMARY KEY,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id          text NOT NULL REFERENCES public.argument_sessions(id) ON DELETE CASCADE,
  payload             jsonb NOT NULL,
  version_number      integer NOT NULL,
  parent_version_id   text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  is_milestone        boolean NOT NULL DEFAULT false,
  change_summary      text
);

CREATE INDEX IF NOT EXISTS idx_session_versions_user_session
  ON public.argument_session_versions (user_id, session_id, version_number);

-- AppState: per-user singleton (pinned frames, recents, dismissals, etc.).
-- One row per user; primary key IS the user_id.
CREATE TABLE IF NOT EXISTS public.app_state (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  payload       jsonb NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Search index: per-frame tokenized text for searchFrames(). One row per frame.
CREATE TABLE IF NOT EXISTS public.search_index (
  frame_id      text PRIMARY KEY REFERENCES public.frames(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload       jsonb NOT NULL,
  -- Full-text vector for substring search. tsvector built from frame title
  -- + description + node text + conclusion statements.
  tsv           tsvector,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_index_user ON public.search_index (user_id);
CREATE INDEX IF NOT EXISTS idx_search_index_tsv ON public.search_index USING GIN (tsv);

-- ============================================================================
-- Row-Level Security
-- ============================================================================
-- Without RLS, an authenticated user could query every other user's rows
-- via the anon key. ALWAYS enable, ALWAYS gate on user_id = auth.uid().

ALTER TABLE public.frames                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frame_versions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.argument_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.argument_session_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_state                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_index               ENABLE ROW LEVEL SECURITY;

-- Compact pattern: one policy per (table, action) that asserts ownership.
DO $$ DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'frames',
    'frame_versions',
    'argument_sessions',
    'argument_session_versions',
    'app_state',
    'search_index'
  ]) LOOP
    EXECUTE format($f$
      DROP POLICY IF EXISTS %1$s_select_own ON public.%1$s;
      CREATE POLICY %1$s_select_own ON public.%1$s
        FOR SELECT USING (user_id = auth.uid());
      DROP POLICY IF EXISTS %1$s_insert_own ON public.%1$s;
      CREATE POLICY %1$s_insert_own ON public.%1$s
        FOR INSERT WITH CHECK (user_id = auth.uid());
      DROP POLICY IF EXISTS %1$s_update_own ON public.%1$s;
      CREATE POLICY %1$s_update_own ON public.%1$s
        FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
      DROP POLICY IF EXISTS %1$s_delete_own ON public.%1$s;
      CREATE POLICY %1$s_delete_own ON public.%1$s
        FOR DELETE USING (user_id = auth.uid());
    $f$, t);
  END LOOP;
END $$;

-- ============================================================================
-- Done. Total tables: 6. Total policies: 24 (4 per table).
-- ============================================================================
