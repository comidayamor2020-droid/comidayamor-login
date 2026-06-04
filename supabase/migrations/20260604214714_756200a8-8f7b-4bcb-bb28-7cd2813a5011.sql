CREATE TABLE public.clientes_b2c (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  telefone text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes_b2c TO authenticated;
GRANT ALL ON public.clientes_b2c TO service_role;

ALTER TABLE public.clientes_b2c ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage clientes_b2c"
ON public.clientes_b2c
FOR ALL
TO authenticated
USING ((current_user_role() = 'admin') AND (current_user_is_active() = true))
WITH CHECK ((current_user_role() = 'admin') AND (current_user_is_active() = true));

CREATE POLICY "gestao manage clientes_b2c"
ON public.clientes_b2c
FOR ALL
TO authenticated
USING ((current_user_role() = 'gestao') AND (current_user_is_active() = true))
WITH CHECK ((current_user_role() = 'gestao') AND (current_user_is_active() = true));

CREATE POLICY "loja read clientes_b2c"
ON public.clientes_b2c
FOR SELECT
TO authenticated
USING ((current_user_role() = 'loja') AND (current_user_is_active() = true));

CREATE POLICY "service_role full access clientes_b2c"
ON public.clientes_b2c
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);