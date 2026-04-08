import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  RECEITA_BLOCKS,
  DESPESA_BLOCKS,
  normalizeSubcategoria,
  type DreBlock,
} from "@/lib/dre-constants";

// ── Legacy flat result (used by Dashboard, Council) ──

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

// ── Types ──

interface RawRow {
  classificacao_dre: string | null;
  subcategoria_dre: string | null;
  valor: number | null;
  data?: string | null;
  data_pagamento?: string | null;
}

export interface MonthKey {
  key: string; // "2026-01"
  label: string; // "Jan/26"
}

export interface DreBlockData {
  block: DreBlock;
  /** subcategoria → month → value */
  subValues: Record<string, Record<string, number>>;
  /** month → block total */
  totals: Record<string, number>;
}

export interface DreMonthlyResult {
  months: MonthKey[];
  receitaBlocks: DreBlockData[];
  receitaTotal: Record<string, number>;
  despesaBlocks: {
    cpv: DreBlockData;
    margemBruta: Record<string, number>;
    despVar: DreBlockData;
    margemContrib: Record<string, number>;
    custoFixo: DreBlockData;
    ebitda: Record<string, number>;
    imposto: DreBlockData;
    lucroLiquido: Record<string, number>;
  };
}

// ── Helpers ──

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function toMonthKey(dateStr: string): string {
  // "2026-04-08" → "2026-04"
  return dateStr.slice(0, 7);
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const m = parseInt(month, 10) - 1;
  return `${MONTH_LABELS[m]}/${year.slice(2)}`;
}

function buildBlockData(block: DreBlock, rows: RawRow[], getDate: (r: RawRow) => string | null): DreBlockData {
  const subValues: Record<string, Record<string, number>> = {};
  const totals: Record<string, number> = {};

  for (const sub of block.subcategorias) {
    subValues[sub] = {};
  }

  for (const row of rows) {
    const normalized = normalizeSubcategoria(row.subcategoria_dre);
    if (!block.subcategorias.includes(normalized)) continue;

    const date = getDate(row);
    if (!date) continue;
    const mk = toMonthKey(date);
    const val = Math.abs(Number(row.valor) || 0);

    if (!subValues[normalized]) subValues[normalized] = {};
    subValues[normalized][mk] = (subValues[normalized][mk] ?? 0) + val;
    totals[mk] = (totals[mk] ?? 0) + val;
  }

  return { block, subValues, totals };
}

function sumRecords(...records: Record<string, number>[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const rec of records) {
    for (const [k, v] of Object.entries(rec)) {
      result[k] = (result[k] ?? 0) + v;
    }
  }
  return result;
}

function subtractRecords(a: Record<string, number>, b: Record<string, number>, months: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const m of months) {
    result[m] = (a[m] ?? 0) - (b[m] ?? 0);
  }
  return result;
}

function collectMonths(...records: Record<string, number>[]): string[] {
  const set = new Set<string>();
  for (const rec of records) {
    for (const k of Object.keys(rec)) set.add(k);
  }
  return Array.from(set).sort();
}

// ── Hook ──

export function useDreData(from?: string, to?: string) {
  return useQuery<DreMonthlyResult>({
    queryKey: ["dre-data", from, to],
    queryFn: async () => {
      // Fetch entradas (receitas)
      let qEntradas = supabase
        .from("fluxo_caixa_entradas")
        .select("classificacao_dre, subcategoria_dre, valor, data");
      if (from) qEntradas = qEntradas.gte("data", from);
      if (to) qEntradas = qEntradas.lte("data", to);
      const { data: entradas, error: e1 } = await qEntradas;
      if (e1) throw e1;

      // Fetch saidas (contas pagas)
      let qSaidas = supabase
        .from("contas_pagar")
        .select("classificacao_dre, subcategoria_dre, valor, data_pagamento")
        .eq("status", "Pago");
      if (from) qSaidas = qSaidas.gte("data_pagamento", from);
      if (to) qSaidas = qSaidas.lte("data_pagamento", to);
      const { data: saidas, error: e2 } = await qSaidas;
      if (e2) throw e2;

      const allEntradas = (entradas ?? []) as RawRow[];
      const allSaidas = (saidas ?? []) as RawRow[];

      // Build receita blocks
      const receitaBlocks = RECEITA_BLOCKS.map((block) =>
        buildBlockData(block, allEntradas, (r) => r.data ?? null)
      );

      // Build despesa blocks
      const cpv = buildBlockData(DESPESA_BLOCKS[0], allSaidas, (r) => r.data_pagamento ?? null);
      const despVar = buildBlockData(DESPESA_BLOCKS[1], allSaidas, (r) => r.data_pagamento ?? null);
      const custoFixo = buildBlockData(DESPESA_BLOCKS[2], allSaidas, (r) => r.data_pagamento ?? null);
      const imposto = buildBlockData(DESPESA_BLOCKS[3], allSaidas, (r) => r.data_pagamento ?? null);

      // Calculate totals
      const receitaTotal = sumRecords(...receitaBlocks.map((b) => b.totals));

      // Collect all months
      const allMonthKeys = collectMonths(
        receitaTotal, cpv.totals, despVar.totals, custoFixo.totals, imposto.totals
      );

      const margemBruta = subtractRecords(receitaTotal, cpv.totals, allMonthKeys);
      const margemContrib = subtractRecords(margemBruta, despVar.totals, allMonthKeys);
      const ebitda = subtractRecords(margemContrib, custoFixo.totals, allMonthKeys);
      const lucroLiquido = subtractRecords(ebitda, imposto.totals, allMonthKeys);

      const months: MonthKey[] = allMonthKeys.map((k) => ({ key: k, label: formatMonthLabel(k) }));

      return {
        months,
        receitaBlocks,
        receitaTotal,
        despesaBlocks: {
          cpv,
          margemBruta,
          despVar,
          margemContrib,
          custoFixo,
          ebitda,
          imposto,
          lucroLiquido,
        },
      };
    },
    staleTime: 30_000,
  });
}
