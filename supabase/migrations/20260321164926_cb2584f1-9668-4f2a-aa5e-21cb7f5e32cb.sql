ALTER TABLE public.users DROP CONSTRAINT users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role = ANY (ARRAY[
  'admin'::text,
  'socio'::text,
  'gestao'::text,
  'financeiro'::text,
  'compras'::text,
  'vendas'::text,
  'producao'::text,
  'gerente_operacional'::text,
  'loja'::text,
  'b2b_cliente'::text,
  'cliente_b2c'::text
]));