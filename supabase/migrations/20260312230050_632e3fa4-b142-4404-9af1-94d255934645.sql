
-- Add company_id to users table to link B2B users to their company
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.b2b_companies(id);

-- RLS for produtos: allow authenticated users to read active products
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read produtos" ON public.produtos
  FOR SELECT TO authenticated USING (true);

-- RLS for b2b_companies: authenticated can read
ALTER TABLE public.b2b_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read b2b_companies" ON public.b2b_companies
  FOR SELECT TO authenticated USING (true);

-- RLS for b2b_orders: users can read/insert their own company orders
ALTER TABLE public.b2b_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own company orders" ON public.b2b_orders
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id FROM public.users u WHERE u.auth_user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND u.role = 'admin')
  );
CREATE POLICY "Users can insert orders for own company" ON public.b2b_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT u.company_id FROM public.users u WHERE u.auth_user_id = auth.uid()
    )
  );

-- RLS for b2b_order_items
ALTER TABLE public.b2b_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own order items" ON public.b2b_order_items
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM public.b2b_orders o
      WHERE o.company_id IN (
        SELECT u.company_id FROM public.users u WHERE u.auth_user_id = auth.uid()
      )
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.auth_user_id = auth.uid() AND u.role = 'admin')
  );
CREATE POLICY "Users can insert own order items" ON public.b2b_order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT o.id FROM public.b2b_orders o
      WHERE o.company_id IN (
        SELECT u.company_id FROM public.users u WHERE u.auth_user_id = auth.uid()
      )
    )
  );
