import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DreLine {
  classificacao_dre: string;
  subcategoria_dre: string;
  valor: number;
}

export interface DreSection {
  label: string;
  key: string;
  items: { subcategoria: string; valor: number }[];
  total: number;
}

export interface DreResult {
  receitasOp: DreSection;
  receitasNaoOp: DreSection;
  receitaTotal: number;
  cpv: DreSection;
  margemBruta: number;
  despesasVar: DreSection;
  margemContribuicao: number;
  custosFixos: DreSection;
  ebitda: number;
  impostos: DreSection;
  lucroLiquido: number;
}

function groupBySubcategoria(items: DreLine[]): { subcategoria: string; valor: number }[] {
  const map = new Map<string, number>();
  for (const i of items) {
    const key = i.subcategoria_dre || "Outros";
    map.set(key, (map.get(key) ?? 0) + Math.abs(Number(i.valor) || 0));
  }
  return Array.from(map.entries())
    .map(([subcategoria, valor]) => ({ subcategoria, valor }))
    .sort((a, b) => b.valor - a.valor);
}

function makeSection(label: string, key: string, items: DreLine[]): DreSection {
  const grouped = groupBySubcategoria(items);
  return { label, key, items: grouped, total: grouped.reduce((s, i) => s + i.valor, 0) };
}

export function useDreData(from?: string, to?: string) {
  return useQuery<DreResult>({
    queryKey: ["dre-data", from, to],
    queryFn: async () => {
      // Fetch entradas (receitas)
      let qEntradas = supabase
        .from("fluxo_caixa_entradas")
        .select("classificacao_dre, subcategoria_dre, valor");
      if (from) qEntradas = qEntradas.gte("data", from);
      if (to) qEntradas = qEntradas.lte("data", to);
      const { data: entradas, error: e1 } = await qEntradas;
      if (e1) throw e1;

      // Fetch saidas (contas pagas)
      let qSaidas = supabase
        .from("contas_pagar")
        .select("classificacao_dre, subcategoria_dre, valor")
        .eq("status", "Pago");
      if (from) qSaidas = qSaidas.gte("data_pagamento", from);
      if (to) qSaidas = qSaidas.lte("data_pagamento", to);
      const { data: saidas, error: e2 } = await qSaidas;
      if (e2) throw e2;

      const allEntradas = (entradas ?? []) as DreLine[];
      const allSaidas = (saidas ?? []) as DreLine[];

      // Group entradas
      const recOpItems = allEntradas.filter(
        (e) => e.classificacao_dre === "receita_operacional"
      );
      const recNaoOpItems = allEntradas.filter(
        (e) => e.classificacao_dre === "receita_nao_operacional"
      );
      // Entradas without classification count as operational
      const recSemClass = allEntradas.filter(
        (e) => !e.classificacao_dre || (e.classificacao_dre !== "receita_operacional" && e.classificacao_dre !== "receita_nao_operacional")
      );

      const receitasOp = makeSection("Receitas Operacionais", "receita_operacional", [...recOpItems, ...recSemClass]);
      const receitasNaoOp = makeSection("Receitas Não Operacionais", "receita_nao_operacional", recNaoOpItems);
      const receitaTotal = receitasOp.total + receitasNaoOp.total;

      // Group saidas
      const cpvItems = allSaidas.filter((s) => s.classificacao_dre === "cpv");
      const despVarItems = allSaidas.filter((s) => s.classificacao_dre === "despesa_variavel");
      const custoFixoItems = allSaidas.filter((s) => s.classificacao_dre === "custo_fixo");
      const impostoItems = allSaidas.filter((s) => s.classificacao_dre === "imposto");
      // Unclassified saidas go to custos fixos
      const saidasSemClass = allSaidas.filter(
        (s) => !s.classificacao_dre || !["cpv", "despesa_variavel", "custo_fixo", "imposto"].includes(s.classificacao_dre)
      );

      const cpv = makeSection("CPV / Custos Diretos", "cpv", cpvItems);
      const margemBruta = receitaTotal - cpv.total;
      const despesasVar = makeSection("Despesas Variáveis", "despesa_variavel", despVarItems);
      const margemContribuicao = margemBruta - despesasVar.total;
      const custosFixos = makeSection("Custos Fixos", "custo_fixo", [...custoFixoItems, ...saidasSemClass]);
      const ebitda = margemContribuicao - custosFixos.total;
      const impostos = makeSection("Impostos", "imposto", impostoItems);
      const lucroLiquido = ebitda - impostos.total;

      return {
        receitasOp,
        receitasNaoOp,
        receitaTotal,
        cpv,
        margemBruta,
        despesasVar,
        margemContribuicao,
        custosFixos,
        ebitda,
        impostos,
        lucroLiquido,
      };
    },
    staleTime: 30_000,
  });
}
