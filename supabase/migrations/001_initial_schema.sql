-- =============================================================================
-- BuildView — Phase 1: Initial Database Schema
-- =============================================================================
-- Run in Supabase SQL Editor or via: supabase db push
-- RLS policies: 002_rls_policies.sql
-- Storage buckets: 003_storage_buckets.sql
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUM Types
-- =============================================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'client');

CREATE TYPE project_status AS ENUM (
  'planning',
  'in_progress',
  'completed',
  'on_hold'
);

CREATE TYPE report_type AS ENUM (
  'progress_report',
  'quality_report',
  'inspection_report',
  'safety_report'
);

CREATE TYPE document_category AS ENUM (
  'drawings',
  'boqs',
  'contracts',
  'approvals',
  'technical_documents',
  'other'
);

CREATE TYPE issue_priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE issue_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

CREATE TYPE invoice_status AS ENUM (
  'draft',
  'sent',
  'paid',
  'overdue',
  'cancelled'
);

CREATE TYPE subscription_status AS ENUM (
  'active',
  'inactive',
  'trial',
  'cancelled'
);

CREATE TYPE notification_type AS ENUM (
  'info',
  'success',
  'warning',
  'error',
  'project_update',
  'issue_update',
  'invoice_update'
);

-- =============================================================================
-- Shared trigger functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_soft_delete_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    NEW.deleted_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 1. clients
-- =============================================================================

CREATE TABLE public.clients (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  company_name      TEXT,
  email             TEXT NOT NULL,
  phone             TEXT,
  address           TEXT,
  logo_url          TEXT,
  subscription_status subscription_status NOT NULL DEFAULT 'trial',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID,
  updated_by        UUID,
  deleted_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT clients_email_unique UNIQUE (email)
);

COMMENT ON TABLE public.clients IS 'Client organizations that own construction projects.';
COMMENT ON COLUMN public.clients.deleted_at IS 'Soft delete timestamp; NULL = active record.';

-- =============================================================================
-- 2. users (extends Supabase auth.users)
-- =============================================================================

CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'client',
  client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  avatar_url  TEXT,
  phone       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID,
  updated_by  UUID,
  deleted_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT users_email_unique UNIQUE (email)
);

COMMENT ON TABLE public.users IS 'Application user profiles linked to Supabase Auth.';

-- Deferred FK constraints for audit columns (users references itself)
ALTER TABLE public.clients
  ADD CONSTRAINT clients_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT clients_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT clients_deleted_by_fkey
    FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.users
  ADD CONSTRAINT users_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT users_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT users_deleted_by_fkey
    FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- =============================================================================
-- 3. projects
-- =============================================================================

CREATE TABLE public.projects (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  client_id         UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  client_name       TEXT NOT NULL,
  location          TEXT NOT NULL,
  description       TEXT,
  status            project_status NOT NULL DEFAULT 'planning',
  start_date        DATE,
  completion_date   DATE,
  cover_image_url   TEXT,
  created_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

COMMENT ON TABLE public.projects IS 'Construction projects monitored via BuildView.';

-- =============================================================================
-- 4. project_assignments
-- =============================================================================

CREATE TABLE public.project_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT project_assignments_project_user_unique UNIQUE (project_id, user_id)
);

COMMENT ON TABLE public.project_assignments IS 'Maps client users to projects they can access.';

-- =============================================================================
-- 5. project_tours (Matterport virtual tours)
-- =============================================================================

CREATE TABLE public.project_tours (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  matterport_url  TEXT NOT NULL,
  capture_date    DATE,
  description     TEXT,
  thumbnail_url   TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

COMMENT ON TABLE public.project_tours IS 'Matterport 3D virtual tour links for a project.';

-- =============================================================================
-- 6. reports
-- =============================================================================

CREATE TABLE public.reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  report_type   report_type NOT NULL,
  report_date   DATE NOT NULL,
  description   TEXT,
  file_url      TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_size     INTEGER,
  mime_type     TEXT DEFAULT 'application/pdf',
  storage_path  TEXT,
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

COMMENT ON TABLE public.reports IS 'Progress and inspection PDF reports for projects.';

-- =============================================================================
-- 7. document_folders
-- =============================================================================

CREATE TABLE public.document_folders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  parent_id   UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT document_folders_no_self_parent CHECK (parent_id IS NULL OR parent_id <> id)
);

COMMENT ON TABLE public.document_folders IS 'Hierarchical folder structure for project documents.';

-- =============================================================================
-- 8. documents
-- =============================================================================

CREATE TABLE public.documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  folder_id     UUID REFERENCES public.document_folders(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  category      document_category NOT NULL DEFAULT 'other',
  description   TEXT,
  file_url      TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_size     INTEGER,
  mime_type     TEXT,
  storage_path  TEXT,
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

COMMENT ON TABLE public.documents IS 'Project files stored in Supabase Storage.';

-- =============================================================================
-- 9. issues
-- =============================================================================

CREATE TABLE public.issues (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  priority      issue_priority NOT NULL DEFAULT 'medium',
  status        issue_status NOT NULL DEFAULT 'open',
  location      TEXT,
  assigned_to   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  due_date      DATE,
  resolved_at   TIMESTAMPTZ,
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

COMMENT ON TABLE public.issues IS 'Construction site issues and defect tracking.';

-- =============================================================================
-- 10. issue_images
-- =============================================================================

CREATE TABLE public.issue_images (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id      UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  storage_path  TEXT,
  caption       TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

COMMENT ON TABLE public.issue_images IS 'Photo attachments for construction issues.';

-- =============================================================================
-- 11. timeline_events
-- =============================================================================

CREATE TABLE public.timeline_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_date      DATE NOT NULL,
  title           TEXT NOT NULL,
  progress_note   TEXT,
  tour_id         UUID REFERENCES public.project_tours(id) ON DELETE SET NULL,
  report_id       UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

COMMENT ON TABLE public.timeline_events IS 'Chronological construction progress milestones.';

-- =============================================================================
-- 12. timeline_photos
-- =============================================================================

CREATE TABLE public.timeline_photos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timeline_event_id UUID NOT NULL REFERENCES public.timeline_events(id) ON DELETE CASCADE,
  image_url         TEXT NOT NULL,
  storage_path      TEXT,
  caption           TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

COMMENT ON TABLE public.timeline_photos IS 'Progress photos linked to timeline events.';

-- =============================================================================
-- 13. invoices
-- =============================================================================

CREATE TABLE public.invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  project_id      UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  invoice_number  TEXT NOT NULL,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency        TEXT NOT NULL DEFAULT 'USD',
  status          invoice_status NOT NULL DEFAULT 'draft',
  due_date        DATE,
  issued_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_date       DATE,
  description     TEXT,
  file_url        TEXT,
  storage_path    TEXT,
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number)
);

COMMENT ON TABLE public.invoices IS 'Client billing and invoice records.';

-- =============================================================================
-- 14. notifications
-- =============================================================================

CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        notification_type NOT NULL DEFAULT 'info',
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  link        TEXT,
  read_at     TIMESTAMPTZ,
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

COMMENT ON TABLE public.notifications IS 'In-app notifications for users.';

-- =============================================================================
-- 15. activity_logs
-- =============================================================================

CREATE TABLE public.activity_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  project_id  UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.activity_logs IS 'Immutable audit trail of user actions (append-only).';

-- =============================================================================
-- Indexes — foreign keys & query performance
-- =============================================================================

-- clients
CREATE INDEX idx_clients_subscription_status ON public.clients(subscription_status);
CREATE INDEX idx_clients_active ON public.clients(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_deleted_at ON public.clients(deleted_at) WHERE deleted_at IS NOT NULL;

-- users
CREATE INDEX idx_users_client_id ON public.users(client_id);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_active ON public.users(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON public.users(email);

-- projects
CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_active ON public.projects(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_created_by ON public.projects(created_by);

-- project_assignments
CREATE INDEX idx_project_assignments_user_id ON public.project_assignments(user_id);
CREATE INDEX idx_project_assignments_project_id ON public.project_assignments(project_id);
CREATE INDEX idx_project_assignments_active ON public.project_assignments(project_id, user_id)
  WHERE deleted_at IS NULL;

-- project_tours
CREATE INDEX idx_project_tours_project_id ON public.project_tours(project_id);
CREATE INDEX idx_project_tours_active ON public.project_tours(project_id) WHERE deleted_at IS NULL;

-- reports
CREATE INDEX idx_reports_project_id ON public.reports(project_id);
CREATE INDEX idx_reports_report_date ON public.reports(report_date DESC);
CREATE INDEX idx_reports_active ON public.reports(project_id) WHERE deleted_at IS NULL;

-- document_folders
CREATE INDEX idx_document_folders_project_id ON public.document_folders(project_id);
CREATE INDEX idx_document_folders_parent_id ON public.document_folders(parent_id);
CREATE INDEX idx_document_folders_active ON public.document_folders(project_id) WHERE deleted_at IS NULL;

-- documents
CREATE INDEX idx_documents_project_id ON public.documents(project_id);
CREATE INDEX idx_documents_folder_id ON public.documents(folder_id);
CREATE INDEX idx_documents_category ON public.documents(category);
CREATE INDEX idx_documents_active ON public.documents(project_id) WHERE deleted_at IS NULL;

-- issues
CREATE INDEX idx_issues_project_id ON public.issues(project_id);
CREATE INDEX idx_issues_status ON public.issues(status);
CREATE INDEX idx_issues_priority ON public.issues(priority);
CREATE INDEX idx_issues_assigned_to ON public.issues(assigned_to);
CREATE INDEX idx_issues_active ON public.issues(project_id) WHERE deleted_at IS NULL;

-- issue_images
CREATE INDEX idx_issue_images_issue_id ON public.issue_images(issue_id);
CREATE INDEX idx_issue_images_active ON public.issue_images(issue_id) WHERE deleted_at IS NULL;

-- timeline_events
CREATE INDEX idx_timeline_events_project_id ON public.timeline_events(project_id);
CREATE INDEX idx_timeline_events_event_date ON public.timeline_events(project_id, event_date DESC);
CREATE INDEX idx_timeline_events_tour_id ON public.timeline_events(tour_id);
CREATE INDEX idx_timeline_events_active ON public.timeline_events(project_id) WHERE deleted_at IS NULL;

-- timeline_photos
CREATE INDEX idx_timeline_photos_event_id ON public.timeline_photos(timeline_event_id);
CREATE INDEX idx_timeline_photos_active ON public.timeline_photos(timeline_event_id) WHERE deleted_at IS NULL;

-- invoices
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_invoices_active ON public.invoices(client_id) WHERE deleted_at IS NULL;

-- notifications
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, created_at DESC)
  WHERE is_read = FALSE AND deleted_at IS NULL;
CREATE INDEX idx_notifications_active ON public.notifications(user_id) WHERE deleted_at IS NULL;

-- activity_logs
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_project_id ON public.activity_logs(project_id);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- =============================================================================
-- updated_at triggers
-- =============================================================================

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_project_assignments_updated_at
  BEFORE UPDATE ON public.project_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_project_tours_updated_at
  BEFORE UPDATE ON public.project_tours
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_document_folders_updated_at
  BEFORE UPDATE ON public.document_folders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_issues_updated_at
  BEFORE UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_issue_images_updated_at
  BEFORE UPDATE ON public.issue_images
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_timeline_events_updated_at
  BEFORE UPDATE ON public.timeline_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_timeline_photos_updated_at
  BEFORE UPDATE ON public.timeline_photos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- Soft-delete audit triggers (sets deleted_by from auth.uid())
-- =============================================================================

CREATE TRIGGER trg_clients_soft_delete
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

CREATE TRIGGER trg_users_soft_delete
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

CREATE TRIGGER trg_projects_soft_delete
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

CREATE TRIGGER trg_project_assignments_soft_delete
  BEFORE UPDATE ON public.project_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

CREATE TRIGGER trg_project_tours_soft_delete
  BEFORE UPDATE ON public.project_tours
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

CREATE TRIGGER trg_reports_soft_delete
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

CREATE TRIGGER trg_document_folders_soft_delete
  BEFORE UPDATE ON public.document_folders
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

CREATE TRIGGER trg_documents_soft_delete
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

CREATE TRIGGER trg_issues_soft_delete
  BEFORE UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

CREATE TRIGGER trg_issue_images_soft_delete
  BEFORE UPDATE ON public.issue_images
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

CREATE TRIGGER trg_timeline_events_soft_delete
  BEFORE UPDATE ON public.timeline_events
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

CREATE TRIGGER trg_timeline_photos_soft_delete
  BEFORE UPDATE ON public.timeline_photos
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

CREATE TRIGGER trg_invoices_soft_delete
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

CREATE TRIGGER trg_notifications_soft_delete
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

-- =============================================================================
-- Auth integration — auto-create user profile on signup
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- Helper views — active (non-deleted) records
-- =============================================================================

CREATE OR REPLACE VIEW public.active_projects AS
  SELECT * FROM public.projects WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_issues AS
  SELECT * FROM public.issues WHERE deleted_at IS NULL;
