
-- PARAMETROS DE CUSTEIO (singleton)
CREATE TABLE public.parametros_custeio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custo_hora_mao_obra numeric,
  custo_energia_kwh numeric NOT NULL DEFAULT 0.75,
  aliquota_imposto numeric NOT NULL DEFAULT 0.06,
  perda_refugo numeric NOT NULL DEFAULT 0.05,
  margem_alvo numeric NOT NULL DEFAULT 0.40,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parametros_custeio TO authenticated;
GRANT ALL ON public.parametros_custeio TO service_role;

ALTER TABLE public.parametros_custeio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parametros_custeio internal read" ON public.parametros_custeio
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin','gestao','gerente_operacional'));

CREATE POLICY "parametros_custeio internal write" ON public.parametros_custeio
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin','gestao','gerente_operacional'))
  WITH CHECK (public.current_user_role() IN ('admin','gestao','gerente_operacional'));

CREATE TRIGGER parametros_custeio_set_updated_at
  BEFORE UPDATE ON public.parametros_custeio
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- seed singleton row
INSERT INTO public.parametros_custeio (custo_hora_mao_obra, custo_energia_kwh, aliquota_imposto, perda_refugo, margem_alvo)
VALUES (NULL, 0.75, 0.06, 0.05, 0.40);

-- INSUMOS DE CUSTEIO (separado da tabela `insumos` de estoque já existente)
CREATE TABLE public.custeio_insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  preco_embalagem numeric NOT NULL DEFAULT 0,
  tamanho_embalagem numeric NOT NULL DEFAULT 1 CHECK (tamanho_embalagem > 0),
  unidade_base text NOT NULL CHECK (unidade_base IN ('g','ml','un')),
  custo_unidade_base numeric GENERATED ALWAYS AS (preco_embalagem / NULLIF(tamanho_embalagem,0)) STORED,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custeio_insumos TO authenticated;
GRANT ALL ON public.custeio_insumos TO service_role;

ALTER TABLE public.custeio_insumos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custeio_insumos internal read" ON public.custeio_insumos
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin','gestao','gerente_operacional'));

CREATE POLICY "custeio_insumos internal write" ON public.custeio_insumos
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin','gestao','gerente_operacional'))
  WITH CHECK (public.current_user_role() IN ('admin','gestao','gerente_operacional'));

CREATE TRIGGER custeio_insumos_set_updated_at
  BEFORE UPDATE ON public.custeio_insumos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
