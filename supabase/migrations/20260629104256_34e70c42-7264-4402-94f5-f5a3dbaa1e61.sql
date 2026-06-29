ALTER TABLE public.parametros_custeio
ADD COLUMN IF NOT EXISTS cdi_anual numeric NOT NULL DEFAULT 0.14;