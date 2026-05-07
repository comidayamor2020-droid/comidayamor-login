import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, parseISO } from "date-fns";

export interface VencimentosCount {
  vencidas: number;
  vencendoEmBreve: number; // 0..3 dias
  total: number;
}

export function useVencimentos() {
  return useQuery({
    queryKey: ["vencimentos-count"],
    queryFn: async (): Promise<VencimentosCount> => {
      const { data, error } = await supabase
        .from("contas_pagar")
        .select("data_vencimento, status")
        .neq("status", "Pago");
      if (error) throw error;
      const now = new Date();
      let vencidas = 0;
      let vencendoEmBreve = 0;
      for (const r of data ?? []) {
        if (!r.data_vencimento) continue;
        const dias = differenceInDays(parseISO(r.data_vencimento), now);
        if (dias < 0) vencidas++;
        else if (dias <= 3) vencendoEmBreve++;
      }
      return { vencidas, vencendoEmBreve, total: vencidas + vencendoEmBreve };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
