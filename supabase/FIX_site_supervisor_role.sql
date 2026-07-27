-- Add site_supervisor to user_role enum (idempotent).
-- Run in Supabase SQL Editor if not already applied via migrations.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'site_supervisor';
