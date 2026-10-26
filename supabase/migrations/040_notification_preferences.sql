-- ============================================================================
-- BuildView — migration 040: notification channel preferences + delivery log
-- ============================================================================
-- Per-user email/WhatsApp opt-in, E.164 phone for WhatsApp, and a delivery
-- log so ops can see whether Resend/Twilio actually accepted a message.
--
-- Apply in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS whatsapp_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_e164 TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.email_notifications IS
  'When false, skip Resend transactional emails for this user (in-app still sent).';
COMMENT ON COLUMN public.users.whatsapp_notifications IS
  'When true and phone_e164 + opt-in are set, send WhatsApp for critical rules.';
COMMENT ON COLUMN public.users.phone_e164 IS
  'WhatsApp-ready phone in E.164 (e.g. +918655224990).';
COMMENT ON COLUMN public.users.whatsapp_opt_in_at IS
  'Timestamp when the user explicitly enabled WhatsApp notifications.';

-- Normalize empty strings to NULL
UPDATE public.users
SET phone_e164 = NULL
WHERE phone_e164 IS NOT NULL AND btrim(phone_e164) = '';

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  rule TEXT,
  status TEXT NOT NULL,
  provider_id TEXT,
  error TEXT,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT notification_deliveries_channel_check
    CHECK (channel IN ('email', 'whatsapp')),
  CONSTRAINT notification_deliveries_status_check
    CHECK (status IN ('sent', 'skipped', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_created
  ON public.notification_deliveries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_channel_created
  ON public.notification_deliveries (channel, created_at DESC);

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_deliveries_select_own_or_staff"
  ON public.notification_deliveries;
CREATE POLICY "notification_deliveries_select_own_or_staff"
  ON public.notification_deliveries
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

-- Inserts use the service role from the notification sender.
