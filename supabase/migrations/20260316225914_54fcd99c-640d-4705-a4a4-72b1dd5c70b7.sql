
-- ============================================================
-- 1. Fix privilege escalation on public.users
--    Revoke full UPDATE, grant only last_login_at column
-- ============================================================
REVOKE UPDATE ON public.users FROM authenticated;
GRANT UPDATE (last_login_at) ON public.users TO authenticated;

-- Drop all existing UPDATE policies for non-admin on users
DROP POLICY IF EXISTS "users can update own last_login" ON public.users;
DROP POLICY IF EXISTS "users can update own last_login_at only" ON public.users;

-- Recreate a safe self-update policy (only last_login_at is grantable)
CREATE POLICY "users can update own last_login_at only"
ON public.users FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Keep admin update policy (admin has full update via service_role or we need explicit grant)
-- Admin updates go through the existing "admins can update all users" policy
-- but admin also needs column-level grant to update all columns
GRANT UPDATE ON public.users TO service_role;

-- ============================================================
-- 2. Fix b2b_companies policies - remove over-broad access
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "admins can read all b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "admins can read b2b_companies" ON public.b2b_companies;
DROP POLICY IF EXISTS "b2b clients can read own company only" ON public.b2b_companies;
DROP POLICY IF EXISTS "b2b_cliente can read own company" ON public.b2b_companies;
DROP POLICY IF EXISTS "admins can manage b2b_companies" ON public.b2b_companies;

-- Admin can do everything on b2b_companies
CREATE POLICY "admin full access b2b_companies"
ON public.b2b_companies FOR ALL
TO authenticated
USING (public.current_user_role() = 'admin' AND public.current_user_is_active() = true)
WITH CHECK (public.current_user_role() = 'admin' AND public.current_user_is_active() = true);

-- b2b_cliente can read only own company
CREATE POLICY "b2b_cliente read own company"
ON public.b2b_companies FOR SELECT
TO authenticated
USING (
  public.current_user_role() = 'b2b_cliente'
  AND public.current_user_is_active() = true
  AND id IN (
    SELECT u.company_id FROM public.users u
    WHERE u.auth_user_id = auth.uid() AND u.is_active = true
  )
);

-- ============================================================
-- 3. Fix b2b_orders policies
-- ============================================================
DROP POLICY IF EXISTS "Users can read own company orders" ON public.b2b_orders;
DROP POLICY IF EXISTS "admins can read all b2b_orders" ON public.b2b_orders;
DROP POLICY IF EXISTS "admin full access b2b_orders" ON public.b2b_orders;
DROP POLICY IF EXISTS "b2b_cliente can read own b2b_orders" ON public.b2b_orders;

-- Admin full access
CREATE POLICY "admin full access b2b_orders"
ON public.b2b_orders FOR ALL
TO authenticated
USING (public.current_user_role() = 'admin' AND public.current_user_is_active() = true)
WITH CHECK (public.current_user_role() = 'admin' AND public.current_user_is_active() = true);

-- b2b_cliente read own company orders
CREATE POLICY "b2b_cliente read own orders"
ON public.b2b_orders FOR SELECT
TO authenticated
USING (
  public.current_user_role() = 'b2b_cliente'
  AND public.current_user_is_active() = true
  AND company_id IN (
    SELECT u.company_id FROM public.users u
    WHERE u.auth_user_id = auth.uid() AND u.is_active = true
  )
);
