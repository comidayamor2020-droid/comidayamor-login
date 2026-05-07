ALTER TABLE public.fluxo_caixa_entradas
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Confirmada';