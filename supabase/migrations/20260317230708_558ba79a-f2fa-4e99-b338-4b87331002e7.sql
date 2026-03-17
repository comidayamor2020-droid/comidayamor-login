
ALTER TABLE public.b2b_companies
  ADD COLUMN IF NOT EXISTS tipo_pedido_minimo text DEFAULT 'sem_minimo',
  ADD COLUMN IF NOT EXISTS pedido_minimo_itens integer DEFAULT 0;
