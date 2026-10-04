import * as XLSX from "xlsx";
import type { Breakdown, Componente, Ficha, Insumo } from "@/lib/custeio";

// Mesmas regras do Simulador de Proposta B2B
const FAIXAS = [
  { min: 15, max: 29 },
  { min: 30, max: 59 },
  { min: 60, max: null as number | null },
];
const MARGENS_B2B_PADRAO = [60, 50, 45];
const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const precoFaixa = (custo: number, m: number) =>
  custo <= 0 || m >= 100 ? null : round2(custo / (1 - m / 100));

const KNOWN = new Set([
  "id", "nome", "tipo", "rendimento", "rendimento_unidade", "horas_trabalho", "energia_kwh",
  "embalagem_custo", "precisa_revisao", "custo_unitario_calculado", "preco_venda_b2c",
  "margem_faixa_1", "margem_faixa_2", "margem_faixa_3", "_bd",
]);

type FichaBd = Ficha & Record<string, any> & { _bd: Breakdown };

export function exportarFichasExcel(params: {
  fichas: FichaBd[];
  componentesPorFicha: Record<string, Componente[]>;
  insumosById: Record<string, Insumo>;
}) {
  const { fichas, componentesPorFicha, insumosById } = params;
  const tipoLabel = (t: string) => (t === "produto_final" ? "Produto final" : "Intermediário");
  const extras = (f: FichaBd) => {
    const o: Record<string, any> = {};
    Object.keys(f).filter((k) => !KNOWN.has(k)).forEach((k) => (o[k] = f[k] ?? ""));
    return o;
  };
  const margens = (f: FichaBd) =>
    [f.margem_faixa_1, f.margem_faixa_2, f.margem_faixa_3].map((v, i) =>
      v != null ? Number(v) : MARGENS_B2B_PADRAO[i]);

  const resumo = fichas.map((f) => {
    const bd = f._bd;
    const cu = bd.custoUnitario;
    const b2c = f.preco_venda_b2c != null ? Number(f.preco_venda_b2c) : null;
    const m = margens(f);
    const b2b = precoFaixa(cu, m[0]);
    return {
      Produto: f.nome,
      Categoria: tipoLabel(f.tipo),
      Rendimento: f.rendimento ?? "",
      Unidade: f.rendimento_unidade ?? "",
      "Custo ingredientes (R$)": round2(bd.custoComponentes),
      "Custo embalagem (R$/un)": round2(bd.custoEmbalagem),
      "Horas de trabalho": f.horas_trabalho ?? "",
      "Custo mão de obra (R$)": Number(f.horas_trabalho ?? 0) > 0 ? round2(bd.custoMaoObra) : "",
      "Energia (kWh)": f.energia_kwh ?? "",
      "Custo energia (R$)": round2(bd.custoEnergia),
      "Custo total da leva (R$)": round2(bd.custoTotalLeva),
      "Custo unitário (R$)": cu,
      "Preço venda B2C (R$)": b2c ?? "",
      "Margem B2C (R$)": b2c != null ? round2(b2c - cu) : "",
      "Margem B2C (%)": b2c ? round2(((b2c - cu) / b2c) * 100) : "",
      "Preço B2B base — faixa 15–29 (R$)": b2b ?? "",
      "Margem B2B base (R$)": b2b != null ? round2(b2b - cu) : "",
      "Margem B2B base (%)": b2b ? round2(((b2b - cu) / b2b) * 100) : "",
      Status: bd.precisaRevisao || f.precisa_revisao ? "precisa revisão" : "ok",
      "Mão de obra incompleta": bd.incompleto ? "sim" : "não",
      Erro: bd.erro ?? "",
      ...extras(f),
    };
  });

  const ingredientes: any[] = [];
  fichas.forEach((f) => {
    const comps = componentesPorFicha[f.id] ?? [];
    const total = f._bd.custoTotalLeva;
    f._bd.linhas.forEach((l, i) => {
      const c = comps[i];
      const ins = c?.insumo_id ? insumosById[c.insumo_id] : undefined;
      const sub = c?.componente_ficha_id ? fichas.find((x) => x.id === c.componente_ficha_id) : undefined;
      ingredientes.push({
        Produto: f.nome,
        Ingrediente: ins?.nome ?? sub?.nome ?? l.label,
        Tipo: c?.componente_tipo === "ficha" ? "Subficha" : "Insumo",
        Quantidade: l.quantidade,
        Unidade: ins?.unidade_base ?? sub?.rendimento_unidade ?? "",
        "Custo unitário do ingrediente (R$)": l.custoUnidade,
        "Custo na receita (R$)": round2(l.subtotal),
        "% do custo total": total > 0 ? round2((l.subtotal / total) * 100) : "",
        "Custo calculado da subficha (R$/un)": sub ? sub._bd.custoUnitario : "",
        "Falta custo": l.faltaCusto ? "sim" : "não",
      });
    });
  });

  const faixas: any[] = [];
  fichas.filter((f) => f.tipo === "produto_final").forEach((f) => {
    const cu = f._bd.custoUnitario;
    const m = margens(f);
    FAIXAS.forEach((fx, i) => {
      const p = precoFaixa(cu, m[i]);
      faixas.push({
        Produto: f.nome,
        "De (un)": fx.min,
        "Até (un)": fx.max ?? "ou mais",
        "Margem-alvo da faixa (%)": m[i],
        "Origem da margem": [f.margem_faixa_1, f.margem_faixa_2, f.margem_faixa_3][i] != null ? "cadastro" : "padrão",
        "Preço B2B (R$)": p ?? "",
        "Margem (R$)": p != null ? round2(p - cu) : "",
        "Margem (%)": p ? round2(((p - cu) / p) * 100) : "",
      });
    });
  });

  const wb = XLSX.utils.book_new();
  const add = (rows: any[], name: string) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const keys = Object.keys(rows[0] ?? {});
    ws["!cols"] = keys.map((k) => ({ wch: Math.max(12, Math.min(40, k.length + 2)) }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  };
  add(resumo, "Resumo");
  add(ingredientes, "Ingredientes");
  add(faixas, "Faixas B2B");

  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  XLSX.writeFile(wb, `fichas-tecnicas-${ymd}.xlsx`);
}
