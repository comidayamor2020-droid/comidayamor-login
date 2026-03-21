
CREATE TABLE public.caixa_disponivel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  valor numeric NOT NULL DEFAULT 0,
  observacao text,
  atualizado_por uuid REFERENCES public.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.caixa_disponivel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage caixa_disponivel" ON public.caixa_disponivel
  FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'gestao', 'financeiro'))
  WITH CHECK (current_user_role() IN ('admin', 'gestao', 'financeiro'));

CREATE POLICY "admin read caixa_disponivel" ON public.caixa_disponivel
  FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin', 'gestao', 'financeiro'));

CREATE POLICY "sr caixa_disponivel" ON public.caixa_disponivel
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
