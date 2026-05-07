import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format } from "date-fns";

export interface FluxoMes {
  entradasEfetivadas: number;
  saidasEfetivadas: number;
  entradasPrevistas: number;
  saidasPrevistas: number;
  saldoAtual: number;
  projecaoMes: number;
}

const STATUS_ENTRADA_EFETIVADA = ["Confirmada", "Recebida"];
const STATUS_SAIDA_EFETIVADA = ["Pago"];

export function useFluxoMes() {
  return useQuery({
    queryKey: ["fluxo-mes"],
    queryFn: async (): Promise<FluxoMes> => {
      const now = new Date();
      const ini = format(startOfMonth(now), "yyyy-MM-dd");
      const fim = format(endOfMonth(now), "yyyy-MM-dd");

      const [{ data: entradas, error: e1 }, { data: saidas, error: e2 }] = await Promise.all([
        supabase
          .from("fluxo_caixa_entradas")
          .select("data, valor, status")
          .gte("data", ini).lte("data", fim),
        supabase
          .from("contas_pagar")
          .select("data_vencimento, data_pagamento, valor, status")
          .gte("data_vencimento", ini).lte("data_vencimento", fim),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;

      let entradasEfetivadas = 0, entradasPrevistas = 0;
      for (const e of entradas ?? []) {
        const status = e.status ?? "Confirmada";
        if (status === "Cancelada") continue;
        const v = Number(e.valor) || 0;
        entradasPrevistas += v;
        if (STATUS_ENTRADA_EFETIVADA.includes(status)) entradasEfetivadas += v;
      }

      let saidasEfetivadas = 0, saidasPrevistas = 0;
      for (const s of saidas ?? []) {
        const status = s.status ?? "Falta pagar";
        if (status === "Cancelada") continue;
        const v = Number(s.valor) || 0;
        saidasPrevistas += v;
        if (STATUS_SAIDA_EFETIVADA.includes(status)) saidasEfetivadas += v;
      }

      return {
        entradasEfetivadas,
        saidasEfetivadas,
        entradasPrevistas,
        saidasPrevistas,
        saldoAtual: entradasEfetivadas - saidasEfetivadas,
        projecaoMes: entradasPrevistas - saidasPrevistas,
      };
    },
    staleTime: 30_000,
  });
}
