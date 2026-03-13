
-- Add pedido_minimo_valor to b2b_companies
ALTER TABLE public.b2b_companies ADD COLUMN IF NOT EXISTS pedido_minimo_valor numeric DEFAULT 0;

-- Allow admin to read all users (needed for Usuários page)
CREATE POLICY "admin can read all users"
  ON public.users FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND u.role = 'admin'));

-- Allow admin to update all users
CREATE POLICY "admin can update all users"
  ON public.users FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND u.role = 'admin'));
