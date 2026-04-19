-- 1. Add status, confirmation tracking columns
ALTER TABLE public.op_contagens_loja
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aberta',
  ADD COLUMN IF NOT EXISTS confirmada_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS confirmada_por uuid;

-- 2. Deduplicate any existing rows: keep the most recent per (produto_id, data_contagem)
DELETE FROM public.op_contagens_loja a
USING public.op_contagens_loja b
WHERE a.produto_id = b.produto_id
  AND a.data_contagem = b.data_contagem
  AND a.created_at < b.created_at;

-- 3. Mark all historical rows as confirmed (legacy data was treated as final)
UPDATE public.op_contagens_loja
SET status = 'confirmada',
    confirmada_em = COALESCE(confirmada_em, created_at)
WHERE status = 'aberta'
  AND data_contagem < CURRENT_DATE;

-- 4. Add unique constraint to prevent duplicates per product/day
CREATE UNIQUE INDEX IF NOT EXISTS op_contagens_loja_produto_data_unique
  ON public.op_contagens_loja (produto_id, data_contagem);

-- 5. Add check constraint for status values
ALTER TABLE public.op_contagens_loja
  DROP CONSTRAINT IF EXISTS op_contagens_loja_status_check;
ALTER TABLE public.op_contagens_loja
  ADD CONSTRAINT op_contagens_loja_status_check CHECK (status IN ('aberta', 'confirmada'));