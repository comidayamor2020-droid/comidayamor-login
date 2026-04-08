import { useState, useMemo } from "react";
import { formatBRL, formatPercent } from "@/lib/format";
import { useDreData, type DreMonthlyResult, type DreBlockData, type MonthKey } from "@/hooks/use-dre-data";
import { getSubcategoriaLabel } from "@/lib/dre-constants";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ChevronDown, ChevronRight, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

type Periodo = "mes_atual" | "mes_anterior" | "3meses" | "6meses" | "12meses" | "custom";

function usePeriodo() {
  const [periodo, setPeriodo] = useState<Periodo>("3meses");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (periodo === "mes_atual") {
      return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
    }
    if (periodo === "mes_anterior") {
      const prev = subMonths(now, 1);
      return { from: format(startOfMonth(prev), "yyyy-MM-dd"), to: format(endOfMonth(prev), "yyyy-MM-dd") };
    }
    if (periodo === "3meses") {
      return { from: format(startOfMonth(subMonths(now, 2)), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
    }
    if (periodo === "6meses") {
      return { from: format(startOfMonth(subMonths(now, 5)), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
    }
    if (periodo === "12meses") {
      return { from: format(startOfMonth(subMonths(now, 11)), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
    }
    return { from: customFrom || undefined, to: customTo || undefined };
  }, [periodo, customFrom, customTo]);

  return { periodo, setPeriodo, from, to, customFrom, setCustomFrom, customTo, setCustomTo };
}

function pct(value: number, total: number) {
  if (!total) return 0;
  return (value / total) * 100;
}

function val(rec: Record<string, number>, month: string): number {
  return rec[month] ?? 0;
}

function sumAllMonths(rec: Record<string, number>): number {
  return Object.values(rec).reduce((a, b) => a + b, 0);
}

export default function DRE() {
  const p = usePeriodo();
  const { data, isLoading, isError } = useDreData(p.from, p.to);

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">DRE Gerencial</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Demonstração do Resultado — Visão mensal
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <select
            value={p.periodo}
            onChange={(e) => p.setPeriodo(e.target.value as Periodo)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
          >
            <option value="mes_atual">Mês atual</option>
            <option value="mes_anterior">Mês anterior</option>
            <option value="3meses">Últimos 3 meses</option>
            <option value="6meses">Últimos 6 meses</option>
            <option value="12meses">Últimos 12 meses</option>
            <option value="custom">Personalizado</option>
          </select>
          {p.periodo === "custom" && (
            <>
              <input type="date" value={p.customFrom} onChange={(e) => p.setCustomFrom(e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm" />
              <span className="text-xs text-muted-foreground">até</span>
              <input type="date" value={p.customTo} onChange={(e) => p.setCustomTo(e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm" />
            </>
          )}
        </div>
      </div>

      {isError && (
        <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar os dados do DRE.
        </div>
      )}

      {isLoading && !data ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        </div>
      ) : data ? (
        <DreTable data={data} />
      ) : null}

      {data && !isLoading && data.months.length === 0 && (
        <div className="mt-6 rounded-lg border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Nenhum lançamento com classificação DRE encontrado neste período.
          <br />
          Classifique as entradas e contas a pagar com "Classificação DRE" e "Subcategoria DRE" para popular esta visão.
        </div>
      )}
    </DashboardLayout>
  );
}

// ── DRE Table ──

function DreTable({ data }: { data: DreMonthlyResult }) {
  const { months, receitaBlocks, receitaTotal, despesaBlocks } = data;
  const { cpv, margemBruta, despVar, margemContrib, custoFixo, ebitda, imposto, lucroLiquido } = despesaBlocks;

  if (months.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-warm">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="bg-bordo-escuro text-quase-branco">
            <th className="sticky left-0 z-10 bg-bordo-escuro px-4 py-3 text-left text-xs font-medium uppercase tracking-wider min-w-[240px]">
              Indicador
            </th>
            {months.map((m) => (
              <th key={m.key} className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider min-w-[120px]">
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* ─── RECEITAS ─── */}
          <SectionHeader label="RECEITAS" colSpan={months.length + 1} />

          {receitaBlocks.map((block) => (
            <BlockRows key={block.block.id} block={block} months={months} receitaTotal={receitaTotal} positive />
          ))}

          <TotalRow
            label="= RECEITA TOTAL"
            values={receitaTotal}
            months={months}
            receitaTotal={receitaTotal}
            accent="primary"
          />

          {/* ─── DESPESAS ─── */}
          <SectionHeader label="DESPESAS" colSpan={months.length + 1} />

          <BlockRows block={cpv} months={months} receitaTotal={receitaTotal} negative prefix="(-) " />
          <TotalRow label="= MARGEM BRUTA" values={margemBruta} months={months} receitaTotal={receitaTotal} accent="success" showPct />

          <BlockRows block={despVar} months={months} receitaTotal={receitaTotal} negative prefix="(-) " />
          <TotalRow label="= MARGEM DE CONTRIBUIÇÃO" values={margemContrib} months={months} receitaTotal={receitaTotal} accent="success" showPct />

          <BlockRows block={custoFixo} months={months} receitaTotal={receitaTotal} negative prefix="(-) " />
          <TotalRow label="= EBITDA" values={ebitda} months={months} receitaTotal={receitaTotal} accent="dynamic" showPct />

          <BlockRows block={imposto} months={months} receitaTotal={receitaTotal} negative prefix="(-) " />
          <TotalRow label="= LUCRO LÍQUIDO" values={lucroLiquido} months={months} receitaTotal={receitaTotal} accent="dynamic" showPct />
        </tbody>
      </table>
    </div>
  );
}

// ── Section Header ──

function SectionHeader({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr className="bg-muted/40">
      <td colSpan={colSpan} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </td>
    </tr>
  );
}

// ── Block Rows (expandable group) ──

function BlockRows({
  block,
  months,
  receitaTotal,
  positive,
  negative,
  prefix = "",
}: {
  block: DreBlockData;
  months: MonthKey[];
  receitaTotal: Record<string, number>;
  positive?: boolean;
  negative?: boolean;
  prefix?: string;
}) {
  const [open, setOpen] = useState(false);
  const blockTotal = sumAllMonths(block.totals);

  return (
    <>
      <tr
        className="border-b border-border/50 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <td className="sticky left-0 z-10 bg-card px-4 py-2.5 font-medium text-foreground">
          <span className="flex items-center gap-2">
            {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            {prefix}{block.block.id} {block.block.label}
          </span>
        </td>
        {months.map((m) => {
          const v = val(block.totals, m.key);
          return (
            <td key={m.key} className={`px-4 py-2.5 text-right tabular-nums font-medium ${negative ? "text-destructive" : "text-foreground"}`}>
              {v === 0 ? "—" : negative ? `- ${formatBRL(v)}` : formatBRL(v)}
            </td>
          );
        })}
      </tr>
      {open && block.block.subcategorias.map((sub) => {
        const subMonths = block.subValues[sub] ?? {};
        const hasData = Object.values(subMonths).some((v) => v > 0);
        const subLabel = getSubcategoriaLabel(block.block.classificacao, sub);

        return (
          <tr key={sub} className="border-b border-border/30 bg-muted/10">
            <td className="sticky left-0 z-10 bg-muted/10 pl-12 pr-4 py-1.5 text-xs text-muted-foreground">
              {subLabel}
            </td>
            {months.map((m) => {
              const v = val(subMonths, m.key);
              return (
                <td key={m.key} className={`px-4 py-1.5 text-right tabular-nums text-xs ${negative ? "text-destructive/70" : "text-foreground/70"}`}>
                  {v === 0 ? "—" : negative ? `- ${formatBRL(v)}` : formatBRL(v)}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

// ── Total/Margin Row ──

function TotalRow({
  label,
  values,
  months,
  receitaTotal,
  accent,
  showPct,
}: {
  label: string;
  values: Record<string, number>;
  months: MonthKey[];
  receitaTotal: Record<string, number>;
  accent: "primary" | "success" | "dynamic";
  showPct?: boolean;
}) {
  return (
    <tr className="border-b border-border bg-accent/20">
      <td className="sticky left-0 z-10 bg-accent/20 px-4 py-3 font-bold text-foreground">
        {label}
      </td>
      {months.map((m) => {
        const v = val(values, m.key);
        const rt = val(receitaTotal, m.key);
        const p = pct(v, rt);
        const isNegative = v < 0;

        let colorClass = "text-foreground";
        if (accent === "dynamic") {
          colorClass = isNegative ? "text-destructive" : "text-success";
        } else if (accent === "success") {
          colorClass = isNegative ? "text-destructive" : "text-success";
        } else {
          colorClass = "text-foreground";
        }

        return (
          <td key={m.key} className={`px-4 py-3 text-right tabular-nums font-bold ${colorClass} ${isNegative && accent === "dynamic" ? "bg-destructive/5" : ""}`}>
            {formatBRL(v)}
            {showPct && rt > 0 && (
              <span className="block text-[10px] font-normal text-muted-foreground">
                ({formatPercent(p)})
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
}
