-- Fichas técnicas
CREATE TABLE public.fichas_tecnicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('intermediario','produto_final')),
  rendimento numeric,
  rendimento_unidade text CHECK (rendimento_unidade IN ('g','ml','un')),
  horas_trabalho numeric,
  energia_kwh numeric,
  embalagem_custo numeric NOT NULL DEFAULT 0,
  precisa_revisao boolean NOT NULL DEFAULT false,
  custo_unitario_calculado numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas_tecnicas TO authenticated;
GRANT ALL ON public.fichas_tecnicas TO service_role;

ALTER TABLE public.fichas_tecnicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fichas_tecnicas_read" ON public.fichas_tecnicas FOR SELECT TO authenticated
USING (public.current_user_role() IN ('admin','gestao','gerente_operacional'));

CREATE POLICY "fichas_tecnicas_write" ON public.fichas_tecnicas FOR ALL TO authenticated
USING (public.current_user_role() IN ('admin','gestao','gerente_operacional'))
WITH CHECK (public.current_user_role() IN ('admin','gestao','gerente_operacional'));

CREATE TRIGGER fichas_tecnicas_updated_at
BEFORE UPDATE ON public.fichas_tecnicas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Componentes
CREATE TABLE public.ficha_componentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id uuid NOT NULL REFERENCES public.fichas_tecnicas(id) ON DELETE CASCADE,
  componente_tipo text NOT NULL CHECK (componente_tipo IN ('insumo','ficha')),
  insumo_id uuid REFERENCES public.custeio_insumos(id) ON DELETE RESTRICT,
  componente_ficha_id uuid REFERENCES public.fichas_tecnicas(id) ON DELETE RESTRICT,
  quantidade numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (componente_tipo='insumo' AND insumo_id IS NOT NULL AND componente_ficha_id IS NULL)
    OR (componente_tipo='ficha' AND componente_ficha_id IS NOT NULL AND insumo_id IS NULL)
  ),
  CHECK (componente_ficha_id IS NULL OR componente_ficha_id <> ficha_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ficha_componentes TO authenticated;
GRANT ALL ON public.ficha_componentes TO service_role;

ALTER TABLE public.ficha_componentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ficha_componentes_read" ON public.ficha_componentes FOR SELECT TO authenticated
USING (public.current_user_role() IN ('admin','gestao','gerente_operacional'));

CREATE POLICY "ficha_componentes_write" ON public.ficha_componentes FOR ALL TO authenticated
USING (public.current_user_role() IN ('admin','gestao','gerente_operacional'))
WITH CHECK (public.current_user_role() IN ('admin','gestao','gerente_operacional'));

CREATE TRIGGER ficha_componentes_updated_at
BEFORE UPDATE ON public.ficha_componentes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ficha_componentes_ficha ON public.ficha_componentes(ficha_id);