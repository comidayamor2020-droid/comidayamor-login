
ALTER TABLE public.contas_pagar
  ADD COLUMN IF NOT EXISTS classificacao_dre text,
  ADD COLUMN IF NOT EXISTS subcategoria_dre text;

ALTER TABLE public.fluxo_caixa_entradas
  ADD COLUMN IF NOT EXISTS classificacao_dre text,
  ADD COLUMN IF NOT EXISTS subcategoria_dre text;
