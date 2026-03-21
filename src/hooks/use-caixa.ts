import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CaixaDisponivel {
  id: string;
  valor: number;
  observacao: string | null;
  atualizado_por: string | null;
  created_at: string;
  /** Joined from users table */
  autor_nome?: string;
}

export function useCaixaDisponivel() {
  return useQuery({
    queryKey: ["caixa-disponivel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caixa_disponivel")
        .select("*, users!caixa_disponivel_atualizado_por_fkey(name)")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      const row = data[0] as any;
      return {
        id: row.id,
        valor: Number(row.valor),
        observacao: row.observacao,
        atualizado_por: row.atualizado_por,
        created_at: row.created_at,
        autor_nome: row.users?.name ?? null,
      } as CaixaDisponivel;
    },
    staleTime: 30_000,
  });
}

export function useUpdateCaixa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ valor, observacao, userId }: { valor: number; observacao?: string; userId?: string }) => {
      const { error } = await supabase.from("caixa_disponivel").insert({
        valor,
        observacao: observacao || null,
        atualizado_por: userId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caixa-disponivel"] });
      qc.invalidateQueries({ queryKey: ["council-caixa"] });
    },
  });
}
