
-- 1) Novos campos em fichas_tecnicas (produtos B2B)
ALTER TABLE public.fichas_tecnicas
  ADD COLUMN IF NOT EXISTS validade_dias integer,
  ADD COLUMN IF NOT EXISTS conservacao text,
  ADD COLUMN IF NOT EXISTS alergenicos text,
  ADD COLUMN IF NOT EXISTS claims text DEFAULT 'Sem glúten • Sem açúcar • Sem lactose';

-- 2) Configuração comercial única
CREATE TABLE IF NOT EXISTS public.config_comercial (
  id integer PRIMARY KEY DEFAULT 1,
  pedido_minimo numeric NOT NULL DEFAULT 250,
  frete_gratis_acima numeric NOT NULL DEFAULT 400,
  valor_frete numeric NOT NULL DEFAULT 25,
  prazo_entrega_dias integer NOT NULL DEFAULT 3,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT config_comercial_single_row CHECK (id = 1)
);

GRANT SELECT ON public.config_comercial TO authenticated;
GRANT INSERT, UPDATE ON public.config_comercial TO authenticated;
GRANT ALL ON public.config_comercial TO service_role;

ALTER TABLE public.config_comercial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config_comercial_read" ON public.config_comercial;
CREATE POLICY "config_comercial_read" ON public.config_comercial
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "config_comercial_write" ON public.config_comercial;
CREATE POLICY "config_comercial_write" ON public.config_comercial
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin','gestao'))
  WITH CHECK (public.current_user_role() IN ('admin','gestao'));

INSERT INTO public.config_comercial (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 3) Sequencial anual das propostas (CYA-YYYY-NNN)
CREATE TABLE IF NOT EXISTS public.propostas_numeros (
  ano integer PRIMARY KEY,
  ultimo_sequencial integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.propostas_numeros TO authenticated;
GRANT ALL ON public.propostas_numeros TO service_role;

ALTER TABLE public.propostas_numeros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "propostas_numeros_read" ON public.propostas_numeros;
CREATE POLICY "propostas_numeros_read" ON public.propostas_numeros
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.next_numero_proposta()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a integer := extract(year from now())::int;
  seq integer;
BEGIN
  INSERT INTO public.propostas_numeros (ano, ultimo_sequencial)
    VALUES (a, 1)
  ON CONFLICT (ano) DO UPDATE
    SET ultimo_sequencial = public.propostas_numeros.ultimo_sequencial + 1,
        updated_at = now()
  RETURNING ultimo_sequencial INTO seq;
  RETURN 'CYA-' || a::text || '-' || lpad(seq::text, 3, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_numero_proposta() TO authenticated;
