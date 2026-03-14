
-- Create security definer functions to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_active, false) FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- Drop ALL existing policies on users table
DROP POLICY IF EXISTS "admin can read all users" ON public.users;
DROP POLICY IF EXISTS "admin can update all users" ON public.users;
DROP POLICY IF EXISTS "admins can read all users" ON public.users;
DROP POLICY IF EXISTS "admins can update all users" ON public.users;
DROP POLICY IF EXISTS "users can view own profile" ON public.users;
DROP POLICY IF EXISTS "service role full access users" ON public.users;
DROP POLICY IF EXISTS "users can update own last_login" ON public.users;

-- Recreate policies using security definer functions (no recursion)
CREATE POLICY "users can view own profile"
ON public.users FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

CREATE POLICY "admin can read all users"
ON public.users FOR SELECT
TO authenticated
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "admin can update all users"
ON public.users FOR UPDATE
TO authenticated
USING (public.get_current_user_role() = 'admin')
WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "users can update own last_login"
ON public.users FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "service role full access users"
ON public.users FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
