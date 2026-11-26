-- =============================================================================
-- 055 — Team notifications: WhatsApp outbox, digests and per-person choices
--
-- notification_outbox: one row per WhatsApp message to send (instant) or to
--   fold into the next digest. The app writes rows; the sender (after the
--   action, and the scheduled runs) delivers them.
-- user_notification_prefs: each person's WhatsApp choice per event
--   ('instant' | 'digest' | 'off'); missing row = the event's default.
--
-- Service-role writes only. Apply in Supabase → SQL Editor. Safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id   UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  event        TEXT NOT NULL,
  channel      TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp')),
  mode         TEXT NOT NULL CHECK (mode IN ('instant', 'digest')),
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  link         TEXT,
  dedupe_key   TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped', 'digested')),
  attempts     INTEGER NOT NULL DEFAULT 0,
  send_after   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at      TIMESTAMPTZ,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notification_outbox_due_idx
  ON public.notification_outbox (status, mode, send_after);
CREATE INDEX IF NOT EXISTS notification_outbox_user_idx
  ON public.notification_outbox (user_id, project_id, status);
-- Same event for the same person while still pending is stored once.
CREATE UNIQUE INDEX IF NOT EXISTS notification_outbox_dedupe_idx
  ON public.notification_outbox (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL AND status = 'pending';

CREATE TABLE IF NOT EXISTS public.user_notification_prefs (
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event          TEXT NOT NULL,
  whatsapp_mode  TEXT NOT NULL CHECK (whatsapp_mode IN ('instant', 'digest', 'off')),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, event)
);

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_prefs ENABLE ROW LEVEL SECURITY;

-- People read their own choices; everything else goes through the service role.
DROP POLICY IF EXISTS "user_notification_prefs_own_read" ON public.user_notification_prefs;
CREATE POLICY "user_notification_prefs_own_read" ON public.user_notification_prefs
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notification_outbox_staff_read" ON public.notification_outbox;
CREATE POLICY "notification_outbox_staff_read" ON public.notification_outbox
  FOR SELECT TO authenticated USING (public.is_buildview_staff());

NOTIFY pgrst, 'reload schema';

-- Check: both tables exist (2 rows).
SELECT table_name FROM information_schema.tables
 WHERE table_schema = 'public' AND table_name IN ('notification_outbox', 'user_notification_prefs');
