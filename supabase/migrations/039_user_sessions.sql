-- ============================================================================
-- BuildView — migration 039: user session / time-on-site tracking
-- ============================================================================
-- Records when authenticated users are actively using the app (dashboard or
-- admin) so User Manager can show real "time on site" instead of only Auth's
-- last_sign_in_at. Heartbeats from the client open or extend a session; an
-- idle gap starts a new one. Duration is (last_seen_at - started_at).
--
-- Apply in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  ended_at TIMESTAMP WITH TIME ZONE,
  -- Cached seconds for closed sessions; open sessions are computed at read time.
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  area TEXT NOT NULL DEFAULT 'app',
  CONSTRAINT user_sessions_duration_nonneg CHECK (duration_seconds >= 0),
  CONSTRAINT user_sessions_area_check CHECK (area IN ('app', 'admin', 'dashboard'))
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_started
  ON public.user_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_open
  ON public.user_sessions (user_id, last_seen_at DESC)
  WHERE ended_at IS NULL;

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_sessions_select_own_or_staff" ON public.user_sessions;
CREATE POLICY "user_sessions_select_own_or_staff" ON public.user_sessions
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role IN ('admin', 'operations_manager', 'super_admin')
    )
  );

-- Writes go through the service role after the app verifies the signed-in user.
-- Authenticated users may only insert/update their own rows as a defense in depth.
DROP POLICY IF EXISTS "user_sessions_insert_own" ON public.user_sessions;
CREATE POLICY "user_sessions_insert_own" ON public.user_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_sessions_update_own" ON public.user_sessions;
CREATE POLICY "user_sessions_update_own" ON public.user_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
