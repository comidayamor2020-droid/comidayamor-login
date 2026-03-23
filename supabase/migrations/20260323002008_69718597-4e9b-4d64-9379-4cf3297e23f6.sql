-- Allow producao role to UPDATE scheduled items (quantidade_produzida, status)
CREATE POLICY "producao_update_programadas_itens" ON public.op_producoes_programadas_itens
  FOR UPDATE TO authenticated
  USING (current_user_role() = 'producao' AND current_user_is_active() = true)
  WITH CHECK (current_user_role() = 'producao' AND current_user_is_active() = true);

-- Allow producao role to UPDATE parent scheduled production status
CREATE POLICY "producao_update_programadas" ON public.op_producoes_programadas
  FOR UPDATE TO authenticated
  USING (current_user_role() = 'producao' AND current_user_is_active() = true)
  WITH CHECK (current_user_role() = 'producao' AND current_user_is_active() = true);