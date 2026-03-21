import { useState, useMemo } from "react";
import { formatBRL, formatPercent } from "@/lib/format";
import { useDreData, type DreSection } from "@/hooks/use-dre-data";
import { getSubcategoriaLabel } from "@/lib/dre-constants";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ChevronDown, ChevronRight, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

type Periodo = "mes_atual" | "mes_anterior" | "custom";

function usePeriodo() {
  const [periodo, setPeriodo] = useState<Periodo>("mes_atual");
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
    return { from: customFrom || undefined, to: customTo || undefined };
  }, [periodo, customFrom, customTo]);

  return { periodo, setPeriodo, from, to, customFrom, setCustomFrom, customTo, setCustomTo };
}

function pct(value: number, total: number) {
  if (!total) return 0;
  return (value / total) * 100;
}

export default function DRE() {
  const p = usePeriodo();
  const { data, isLoading, isError } = useDreData(p.from, p.to);

  const periodoLabel = p.periodo === "mes_atual"
    ? format(new Date(), "MMMM yyyy", { locale: ptBR })
    : p.periodo === "mes_anterior"
    ? format(subMonths(new Date(), 1), "MMMM yyyy", { locale: ptBR })
    : "Período personalizado";

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">DRE Gerencial</h1>
          <p className="mt-1 text-sm text-muted-foreground capitalize">
            Demonstração do Resultado — {periodoLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <select
            value={p.periodo}
            onChange={(e) => p.setPeriodo(e.target.value as Periodo)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
          >
            <option value="mes_atual">Mês atual</option>
            <option value="mes_anterior">Mês anterior</option>
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
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Indicador</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Valor (R$)</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">% Receita</th>
              </tr>
            </thead>
            <tbody>
              {/* Receitas Operacionais */}
              <SectionBlock section={data.receitasOp} receitaTotal={data.receitaTotal} positive />
              {/* Receitas Não Operacionais */}
              <SectionBlock section={data.receitasNaoOp} receitaTotal={data.receitaTotal} positive />
              {/* Receita Total */}
              <TotalRow label="Receita Total" value={data.receitaTotal} percent={100} bold accent="primary" />

              {/* CPV */}
              <SectionBlock section={data.cpv} receitaTotal={data.receitaTotal} negative />
              <TotalRow label="(=) Margem Bruta" value={data.margemBruta} percent={pct(data.margemBruta, data.receitaTotal)} bold accent="success" />

              {/* Despesas Variáveis */}
              <SectionBlock section={data.despesasVar} receitaTotal={data.receitaTotal} negative />
              <TotalRow label="(=) Margem de Contribuição" value={data.margemContribuicao} percent={pct(data.margemContribuicao, data.receitaTotal)} bold accent="success" />

              {/* Custos Fixos */}
              <SectionBlock section={data.custosFixos} receitaTotal={data.receitaTotal} negative />
              <TotalRow label="(=) EBITDA" value={data.ebitda} percent={pct(data.ebitda, data.receitaTotal)} bold accent={data.ebitda >= 0 ? "success" : "destructive"} />

              {/* Impostos */}
              <SectionBlock section={data.impostos} receitaTotal={data.receitaTotal} negative />
              <TotalRow label="(=) Lucro Líquido" value={data.lucroLiquido} percent={pct(data.lucroLiquido, data.receitaTotal)} bold accent={data.lucroLiquido >= 0 ? "success" : "destructive"} />
            </tbody>
          </table>
        </div>
      ) : null}

      {data && !isLoading && data.receitaTotal === 0 && (
        <div className="mt-6 rounded-lg border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Nenhum lançamento com classificação DRE encontrado neste período.
          <br />
          Classifique as entradas e contas a pagar com "Classificação DRE" e "Subcategoria DRE" para popular esta visão.
        </div>
      )}
    </DashboardLayout>
  );
}

function SectionBlock({ section, receitaTotal, positive, negative }: { section: DreSection; receitaTotal: number; positive?: boolean; negative?: boolean }) {
  const [open, setOpen] = useState(false);
  const prefix = negative ? "(-) " : "";

  if (section.total === 0 && section.items.length === 0) {
    return (
      <tr className="border-b border-border">
        <td className="px-5 py-2.5 font-medium text-muted-foreground">{prefix}{section.label}</td>
        <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">R$ 0,00</td>
        <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">0,00%</td>
      </tr>
    );
  }

  return (
    <>
      <tr
        className="border-b border-border cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <td className="px-5 py-2.5 font-medium text-foreground flex items-center gap-2">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          {prefix}{section.label}
        </td>
        <td className={`px-5 py-2.5 text-right tabular-nums font-medium ${negative ? "text-destructive" : "text-foreground"}`}>
          {negative ? `- ${formatBRL(section.total)}` : formatBRL(section.total)}
        </td>
        <td className={`px-5 py-2.5 text-right tabular-nums ${negative ? "text-destructive" : "text-muted-foreground"}`}>
          {formatPercent(pct(section.total, receitaTotal))}
        </td>
      </tr>
      {open && section.items.map((item) => (
        <tr key={item.subcategoria} className="border-b border-border/50 bg-muted/10">
          <td className="pl-12 pr-5 py-2 text-muted-foreground text-xs">{item.subcategoria}</td>
          <td className={`px-5 py-2 text-right tabular-nums text-xs ${negative ? "text-destructive/80" : "text-foreground/80"}`}>
            {negative ? `- ${formatBRL(item.valor)}` : formatBRL(item.valor)}
          </td>
          <td className="px-5 py-2 text-right tabular-nums text-xs text-muted-foreground">
            {formatPercent(pct(item.valor, receitaTotal))}
          </td>
        </tr>
      ))}
    </>
  );
}

function TotalRow({ label, value, percent, bold, accent }: { label: string; value: number; percent: number; bold?: boolean; accent?: string }) {
  const colorClass = accent === "destructive" ? "text-destructive" : accent === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground";
  return (
    <tr className="border-b border-border bg-muted/20">
      <td className={`px-5 py-3 ${bold ? "font-semibold" : "font-medium"} text-foreground`}>{label}</td>
      <td className={`px-5 py-3 text-right tabular-nums ${bold ? "font-semibold" : "font-medium"} ${colorClass}`}>
        {formatBRL(value)}
      </td>
      <td className={`px-5 py-3 text-right tabular-nums ${bold ? "font-semibold" : ""} ${colorClass}`}>
        {formatPercent(percent)}
      </td>
    </tr>
  );
}
