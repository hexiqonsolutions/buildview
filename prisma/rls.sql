-- BuildView CRM — Row Level Security helpers
-- Run in Supabase SQL editor AFTER prisma migrate.
-- Prisma owns table DDL; this file enables tenant isolation for direct client access.

CREATE OR REPLACE FUNCTION public.current_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM memberships
  WHERE user_id = auth.uid()
    AND deleted_at IS NULL
    AND status = 'ACTIVE';
$$;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Users can read themselves
CREATE POLICY users_read_self ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY users_update_self ON users
  FOR UPDATE USING (id = auth.uid());

-- Memberships: members of same org
CREATE POLICY memberships_tenant ON memberships
  FOR ALL USING (organization_id IN (SELECT public.current_user_org_ids()));

CREATE POLICY organizations_tenant ON organizations
  FOR ALL USING (id IN (SELECT public.current_user_org_ids()));

CREATE POLICY invitations_tenant ON invitations
  FOR ALL USING (organization_id IN (SELECT public.current_user_org_ids()));

CREATE POLICY audit_logs_tenant ON audit_logs
  FOR ALL USING (organization_id IN (SELECT public.current_user_org_ids()));

CREATE POLICY leads_tenant ON leads
  FOR ALL USING (organization_id IN (SELECT public.current_user_org_ids()));

CREATE POLICY tags_tenant ON tags
  FOR ALL USING (organization_id IN (SELECT public.current_user_org_ids()));

CREATE POLICY lead_tags_tenant ON lead_tags
  FOR ALL USING (
    lead_id IN (
      SELECT id FROM leads
      WHERE organization_id IN (SELECT public.current_user_org_ids())
        AND deleted_at IS NULL
    )
  );

CREATE POLICY email_accounts_tenant ON email_accounts
  FOR ALL USING (organization_id IN (SELECT public.current_user_org_ids()));

CREATE POLICY email_threads_tenant ON email_threads
  FOR ALL USING (organization_id IN (SELECT public.current_user_org_ids()));

CREATE POLICY email_messages_tenant ON email_messages
  FOR ALL USING (organization_id IN (SELECT public.current_user_org_ids()));

CREATE POLICY email_attachments_tenant ON email_attachments
  FOR ALL USING (
    message_id IN (
      SELECT id FROM email_messages
      WHERE organization_id IN (SELECT public.current_user_org_ids())
    )
  );

CREATE POLICY email_templates_tenant ON email_templates
  FOR ALL USING (organization_id IN (SELECT public.current_user_org_ids()));

CREATE POLICY email_campaigns_tenant ON email_campaigns
  FOR ALL USING (organization_id IN (SELECT public.current_user_org_ids()));

CREATE POLICY follow_ups_tenant ON follow_ups
  FOR ALL USING (organization_id IN (SELECT public.current_user_org_ids()));

CREATE POLICY activities_tenant ON activities
  FOR ALL USING (organization_id IN (SELECT public.current_user_org_ids()));

CREATE POLICY documents_tenant ON documents
  FOR ALL USING (organization_id IN (SELECT public.current_user_org_ids()));
