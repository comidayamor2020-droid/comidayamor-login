
-- contas_pagar: allow gerente_operacional full access
CREATE POLICY "gerente_op manage contas_pagar" ON public.contas_pagar
FOR ALL TO authenticated
USING (current_user_role() = 'gerente_operacional' AND current_user_is_active() = true)
WITH CHECK (current_user_role() = 'gerente_operacional' AND current_user_is_active() = true);

-- fluxo_caixa_entradas: allow gerente_operacional full access
CREATE POLICY "gerente_op manage entradas" ON public.fluxo_caixa_entradas
FOR ALL TO authenticated
USING (current_user_role() = 'gerente_operacional' AND current_user_is_active() = true)
WITH CHECK (current_user_role() = 'gerente_operacional' AND current_user_is_active() = true);

-- caixa_disponivel: extend manage policy via new policy for gerente_operacional
CREATE POLICY "gerente_op manage caixa" ON public.caixa_disponivel
FOR ALL TO authenticated
USING (current_user_role() = 'gerente_operacional' AND current_user_is_active() = true)
WITH CHECK (current_user_role() = 'gerente_operacional' AND current_user_is_active() = true);
