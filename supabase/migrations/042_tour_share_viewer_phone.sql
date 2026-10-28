-- ============================================================================
-- BuildView — migration 042: contact number on tour share viewers
-- ============================================================================
-- Adds viewer_phone to tour_share_views (collected on the public share gate).
-- Apply in Supabase → SQL Editor after 041. Safe to re-run.
-- ============================================================================

ALTER TABLE public.tour_share_views
  ADD COLUMN IF NOT EXISTS viewer_phone TEXT;

COMMENT ON COLUMN public.tour_share_views.viewer_phone IS
  'Phone entered on the public share gate (required with name + email).';

COMMENT ON TABLE public.tour_share_views IS
  'People who opened a shared tour link (name, phone, and email required).';
