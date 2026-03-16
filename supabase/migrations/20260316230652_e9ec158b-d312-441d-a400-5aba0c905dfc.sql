
-- 1. Drop the existing policy
DROP POLICY IF EXISTS "users can update own last_login_at only" ON public.users;

-- 2. Revoke broad UPDATE from all non-admin roles
REVOKE UPDATE ON public.users FROM authenticated;
REVOKE UPDATE ON public.users FROM anon;
REVOKE UPDATE ON public.users FROM public;

-- 3. Grant UPDATE only on last_login_at to authenticated
GRANT UPDATE (last_login_at) ON public.users TO authenticated;

-- 4. Recreate the RLS policy
CREATE POLICY "users can update own last_login_at only"
ON public.users
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());
