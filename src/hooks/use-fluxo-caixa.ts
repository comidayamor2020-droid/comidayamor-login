import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EntradaCaixa {
  id: string;
  data: string;
  descricao: string;
  categoria: string;
  valor: number;
  observacao: string | null;
  origem: string;
  criado_por: string | null;
  created_at: string;
}

export function useEntradas(from?: string, to?: string) {
  return useQuery({
    queryKey: ["fluxo-entradas", from, to],
    queryFn: async () => {
      let q = supabase
        .from("fluxo_caixa_entradas")
        .select("*")
        .order("data", { ascending: false });
      if (from) q = q.gte("data", from);
      if (to) q = q.lte("data", to);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as EntradaCaixa[];
    },
    staleTime: 30_000,
  });
}

export function useCreateEntrada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      data: string;
      descricao: string;
      categoria: string;
      valor: number;
      observacao?: string;
      criado_por?: string;
      classificacao_dre?: string;
      subcategoria_dre?: string;
    }) => {
      const { error } = await supabase.from("fluxo_caixa_entradas").insert({
        data: payload.data,
        descricao: payload.descricao,
        categoria: payload.categoria,
        valor: payload.valor,
        observacao: payload.observacao || null,
        origem: "manual",
        criado_por: payload.criado_por || null,
        classificacao_dre: payload.classificacao_dre || null,
        subcategoria_dre: payload.subcategoria_dre || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fluxo-entradas"] });
    },
  });
}

export interface SaidaCaixa {
  id: string;
  data: string;
  descricao: string;
  categoria: string | null;
  valor: number;
  fornecedor: string | null;
  forma_pagamento: string | null;
  origem: string;
}

export function useSaidas(from?: string, to?: string) {
  return useQuery({
    queryKey: ["fluxo-saidas", from, to],
    queryFn: async () => {
      let q = supabase
        .from("contas_pagar")
        .select("id, descricao, valor, categoria, fornecedor, forma_pagamento, data_pagamento, data_vencimento")
        .eq("status", "Pago");
      if (from) q = q.gte("data_pagamento", from);
      if (to) q = q.lte("data_pagamento", to);
      const { data, error } = await q.order("data_pagamento", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        id: c.id,
        data: c.data_pagamento || c.data_vencimento || "",
        descricao: c.descricao,
        categoria: c.categoria,
        valor: Number(c.valor) || 0,
        fornecedor: c.fornecedor,
        forma_pagamento: c.forma_pagamento,
        origem: "contas_pagar",
      })) as SaidaCaixa[];
    },
    staleTime: 30_000,
  });
}
