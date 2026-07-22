-- Platform settings (singleton row) + notification insert for staff/system

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  company_name TEXT NOT NULL DEFAULT 'BuildView',
  support_email TEXT NOT NULL DEFAULT 'ops@buildview.com',
  default_currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  notification_rules JSONB NOT NULL DEFAULT '{"onUpload":true,"onCriticalIssue":true,"onInvoiceSent":true}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

INSERT INTO public.platform_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_settings_authenticated_read"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "platform_settings_staff_write"
  ON public.platform_settings
  FOR ALL
  TO authenticated
  USING (public.is_buildview_staff())
  WITH CHECK (public.is_buildview_staff());

-- Allow BuildView staff to insert notifications (system alerts from uploads/issues)
CREATE POLICY "notifications_staff_insert"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_buildview_staff());

COMMENT ON TABLE public.platform_settings IS 'Singleton platform configuration for BuildView ops + client portal.';
