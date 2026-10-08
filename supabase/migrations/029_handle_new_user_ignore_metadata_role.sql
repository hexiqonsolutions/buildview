-- Security fix: raw_user_meta_data is supplied by the user at sign-up
-- (supabase.auth.signUp({ options: { data } }) with the public anon key),
-- so it must never decide the role. Every new profile starts as 'client';
-- staff promote users explicitly afterwards.

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
    'client'
  );
  RETURN NEW;
END;
$$;
