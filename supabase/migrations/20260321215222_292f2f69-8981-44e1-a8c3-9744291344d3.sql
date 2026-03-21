
CREATE TABLE public.fluxo_caixa_entradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL DEFAULT CURRENT_DATE,
  descricao text NOT NULL,
  categoria text NOT NULL DEFAULT 'outros',
  valor numeric NOT NULL DEFAULT 0,
  observacao text,
  origem text NOT NULL DEFAULT 'manual',
  criado_por uuid REFERENCES public.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fluxo_caixa_entradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fin_manage_entradas" ON public.fluxo_caixa_entradas
  FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'gestao', 'financeiro'))
  WITH CHECK (current_user_role() IN ('admin', 'gestao', 'financeiro'));

CREATE POLICY "fin_read_entradas" ON public.fluxo_caixa_entradas
  FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin', 'gestao', 'financeiro'));

CREATE POLICY "sr_entradas" ON public.fluxo_caixa_entradas
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
