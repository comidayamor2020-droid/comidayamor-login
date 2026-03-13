-- Allow producao role to read and update b2b_orders
CREATE POLICY "producao can read b2b_orders"
ON public.b2b_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid() AND u.role = 'producao'
  )
);

CREATE POLICY "producao can update b2b_orders"
ON public.b2b_orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid() AND u.role = 'producao'
  )
);

-- Allow producao role to read b2b_order_items
CREATE POLICY "producao can read b2b_order_items"
ON public.b2b_order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid() AND u.role = 'producao'
  )
);

-- Allow producao role to read b2b_companies
CREATE POLICY "producao can read b2b_companies"
ON public.b2b_companies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid() AND u.role = 'producao'
  )
);