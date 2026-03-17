
-- Enable RLS on all op_ tables
ALTER TABLE public.op_config_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_estoque_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_lotes_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_contagens_loja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_solicitacoes_ocorrencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_producoes_programadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_producoes_programadas_itens ENABLE ROW LEVEL SECURITY;

-- op_config_produtos
CREATE POLICY "op_config_read" ON public.op_config_produtos FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin','gestao','gerente_operacional','producao','loja'));
CREATE POLICY "op_config_manage" ON public.op_config_produtos FOR ALL TO authenticated
  USING (current_user_role() IN ('admin','gestao','gerente_operacional'))
  WITH CHECK (current_user_role() IN ('admin','gestao','gerente_operacional'));
CREATE POLICY "sr_op_config" ON public.op_config_produtos FOR ALL TO service_role USING (true) WITH CHECK (true);

-- op_estoque_produtos
CREATE POLICY "op_estoque_read" ON public.op_estoque_produtos FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin','gestao','gerente_operacional','producao','loja'));
CREATE POLICY "op_estoque_manage" ON public.op_estoque_produtos FOR ALL TO authenticated
  USING (current_user_role() IN ('admin','gestao','gerente_operacional'))
  WITH CHECK (current_user_role() IN ('admin','gestao','gerente_operacional'));
CREATE POLICY "sr_op_estoque" ON public.op_estoque_produtos FOR ALL TO service_role USING (true) WITH CHECK (true);

-- op_lotes_producao
CREATE POLICY "op_lotes_read" ON public.op_lotes_producao FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin','gestao','gerente_operacional','producao','loja'));
CREATE POLICY "op_lotes_insert" ON public.op_lotes_producao FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('admin','gestao','gerente_operacional','producao'));
CREATE POLICY "op_lotes_update" ON public.op_lotes_producao FOR UPDATE TO authenticated
  USING (current_user_role() IN ('admin','gestao','gerente_operacional','producao'))
  WITH CHECK (current_user_role() IN ('admin','gestao','gerente_operacional','producao'));
CREATE POLICY "sr_op_lotes" ON public.op_lotes_producao FOR ALL TO service_role USING (true) WITH CHECK (true);

-- op_contagens_loja
CREATE POLICY "op_contagens_read" ON public.op_contagens_loja FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin','gestao','gerente_operacional','producao','loja'));
CREATE POLICY "op_contagens_insert" ON public.op_contagens_loja FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('admin','gestao','gerente_operacional','loja'));
CREATE POLICY "op_contagens_update" ON public.op_contagens_loja FOR UPDATE TO authenticated
  USING (current_user_role() IN ('admin','gestao','gerente_operacional','loja'))
  WITH CHECK (current_user_role() IN ('admin','gestao','gerente_operacional','loja'));
CREATE POLICY "sr_op_contagens" ON public.op_contagens_loja FOR ALL TO service_role USING (true) WITH CHECK (true);

-- op_solicitacoes_ocorrencia
CREATE POLICY "op_ocorrencias_read" ON public.op_solicitacoes_ocorrencia FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin','gestao','gerente_operacional','producao','loja'));
CREATE POLICY "op_ocorrencias_insert" ON public.op_solicitacoes_ocorrencia FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('admin','gestao','gerente_operacional','producao','loja'));
CREATE POLICY "op_ocorrencias_update" ON public.op_solicitacoes_ocorrencia FOR UPDATE TO authenticated
  USING (current_user_role() IN ('admin','gestao','gerente_operacional'))
  WITH CHECK (current_user_role() IN ('admin','gestao','gerente_operacional'));
CREATE POLICY "sr_op_ocorrencias" ON public.op_solicitacoes_ocorrencia FOR ALL TO service_role USING (true) WITH CHECK (true);

-- op_producoes_programadas
CREATE POLICY "op_programadas_read" ON public.op_producoes_programadas FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin','gestao','gerente_operacional','producao'));
CREATE POLICY "op_programadas_manage" ON public.op_producoes_programadas FOR ALL TO authenticated
  USING (current_user_role() IN ('admin','gestao','gerente_operacional'))
  WITH CHECK (current_user_role() IN ('admin','gestao','gerente_operacional'));
CREATE POLICY "sr_op_programadas" ON public.op_producoes_programadas FOR ALL TO service_role USING (true) WITH CHECK (true);

-- op_producoes_programadas_itens
CREATE POLICY "op_programadas_itens_read" ON public.op_producoes_programadas_itens FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin','gestao','gerente_operacional','producao'));
CREATE POLICY "op_programadas_itens_manage" ON public.op_producoes_programadas_itens FOR ALL TO authenticated
  USING (current_user_role() IN ('admin','gestao','gerente_operacional'))
  WITH CHECK (current_user_role() IN ('admin','gestao','gerente_operacional'));
CREATE POLICY "sr_op_programadas_itens" ON public.op_producoes_programadas_itens FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow gestao/gerente_operacional to read vendas and itens_venda for conciliation
CREATE POLICY "gestao_read_vendas" ON public.vendas FOR SELECT TO authenticated
  USING (current_user_role() IN ('gestao','gerente_operacional'));
CREATE POLICY "gestao_read_itens_venda" ON public.itens_venda FOR SELECT TO authenticated
  USING (current_user_role() IN ('gestao','gerente_operacional'));
