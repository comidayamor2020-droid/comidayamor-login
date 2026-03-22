
CREATE TABLE public.op_ajustes_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo_ajuste text NOT NULL CHECK (tipo_ajuste IN ('positivo', 'negativo', 'zerar')),
  quantidade_anterior numeric NOT NULL DEFAULT 0,
  quantidade_ajustada numeric NOT NULL DEFAULT 0,
  quantidade_final numeric NOT NULL DEFAULT 0,
  motivo text NOT NULL,
  observacao text,
  ajustado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.op_ajustes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "op_ajustes_manage" ON public.op_ajustes_estoque
  FOR ALL TO authenticated
  USING (current_user_role() = ANY (ARRAY['admin'::text, 'gestao'::text]))
  WITH CHECK (current_user_role() = ANY (ARRAY['admin'::text, 'gestao'::text]));

CREATE POLICY "op_ajustes_read" ON public.op_ajustes_estoque
  FOR SELECT TO authenticated
  USING (current_user_role() = ANY (ARRAY['admin'::text, 'gestao'::text, 'gerente_operacional'::text]));

CREATE POLICY "sr_op_ajustes" ON public.op_ajustes_estoque
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
