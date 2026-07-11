ALTER TABLE public.fichas_tecnicas
  ADD COLUMN IF NOT EXISTS margem_faixa_1 numeric,
  ADD COLUMN IF NOT EXISTS margem_faixa_2 numeric,
  ADD COLUMN IF NOT EXISTS margem_faixa_3 numeric;