-- Promote vaibhavpgurav@gmail.com to BuildView super_admin
-- Run in Supabase SQL Editor if the user already exists in auth.users / public.users

UPDATE public.users
SET
  role = 'super_admin',
  client_id = NULL,
  is_active = TRUE,
  updated_at = NOW()
WHERE lower(email) = lower('vaibhavpgurav@gmail.com');

-- If the user exists in auth but not public.users, insert after they sign up once.
-- Auth metadata (optional — helps provision-user on next login):
-- Update via Supabase Dashboard → Authentication → Users → user → Raw user meta data:
-- { "role": "super_admin", "full_name": "Vaibhav Gurav" }
