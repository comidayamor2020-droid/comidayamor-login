import { formatBRL, formatPercent } from "@/lib/format";
import { useDreData, toFlatDreResult } from "@/hooks/use-dre-data";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useCaixaDisponivel } from "@/hooks/use-caixa";
import { useCouncilContext } from "@/hooks/use-council-context";
import {
  Wallet, AlertTriangle, Clock, Calendar, TrendingUp, TrendingDown, BarChart3, Users,
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";

export default function Dashboard() {
  const { data: dreRaw, isError } = useDreData();
  const dreData = useMemo(() => dreRaw ? toFlatDreResult(dreRaw) : null, [dreRaw]);
  const { data: caixa } = useCaixaDisponivel();
  const ctx = useCouncilContext();
  const navigate = useNavigate();
  const ctx = useCouncilContext();
  const navigate = useNavigate();

  const cf = ctx.cashFlow;
  const severity = ctx.loading ? null : assessDashboardSeverity(ctx);

  const pctCalc = (v: number, t: number) => (t ? (v / t) * 100 : 0);

  // Alert level styling
  const alertStyles = {
    normal: { border: "border-success/30", bg: "bg-success/5", text: "text-success", label: "Operação estável" },
    atencao: { border: "border-caramelo/50", bg: "bg-caramelo/5", text: "text-caramelo", label: "Atenção — monitorar" },
    alerta: { border: "border-caramelo", bg: "bg-caramelo/10", text: "text-caramelo", label: "Alerta — ação necessária" },
    critico: { border: "border-destructive", bg: "bg-destructive/10", text: "text-destructive", label: "Crítico — ação imediata" },
  };

  const alertLevel = severity?.level ?? "normal";
  const alert = alertStyles[alertLevel];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão executiva da operação</p>
        </div>

        {isError && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            Não foi possível carregar os dados da API.
          </div>
        )}

        {/* Alerta consolidado do Conselho */}
        {severity && (
          <div
            className={`rounded-xl border-2 ${alert.border} ${alert.bg} p-4 flex items-start gap-3 cursor-pointer hover:shadow-md transition-shadow`}
            onClick={() => navigate("/conselho")}
          >
            <Users className={`h-5 w-5 shrink-0 mt-0.5 ${alert.text}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className={`text-sm font-bold ${alert.text}`}>{alert.label}</p>
                <span className="text-[10px] text-muted-foreground">Conselho</span>
              </div>
              <ul className="space-y-0.5">
                {severity.reasons.slice(0, 4).map((r, i) => (
                  <li key={i} className="text-xs text-muted-foreground">→ {r}</li>
                ))}
              </ul>
              <p className="text-[10px] text-primary mt-1.5 font-medium">Clique para abrir o Conselho →</p>
            </div>
          </div>
        )}

        {/* Caixa + Compromissos */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <MetricCard
            icon={Wallet}
            label="Caixa Disponível"
            value={formatBRL(cf.caixaDisponivel)}
            color="text-foreground"
            sub={caixa ? `Atualizado ${format(new Date(caixa.created_at), "dd/MM HH:mm")}` : undefined}
          />
          <MetricCard
            icon={AlertTriangle}
            label="Contas Vencidas"
            value={formatBRL(cf.totalVencidas)}
            color={cf.totalVencidas > 0 ? "text-destructive" : "text-muted-foreground"}
            sub={cf.contasVencidas.length > 0 ? `${cf.contasVencidas.length} conta(s)` : "Nenhuma"}
          />
          <MetricCard
            icon={Clock}
            label="Vencendo em 2 dias"
            value={formatBRL(cf.totalProx2Dias)}
            color={cf.totalProx2Dias > 0 ? "text-orange-600" : "text-muted-foreground"}
            sub={cf.contasProx2Dias.length > 0 ? `${cf.contasProx2Dias.length} conta(s)` : "Nenhuma"}
          />
          <MetricCard
            icon={Calendar}
            label="Compromissos 7 dias"
            value={formatBRL(cf.totalProx7Dias)}
            color={cf.totalProx7Dias > 0 ? "text-amber-600" : "text-muted-foreground"}
            sub={cf.contasProx7Dias.length > 0 ? `${cf.contasProx7Dias.length} conta(s)` : "Nenhum"}
          />
          <MetricCard
            icon={cf.folgaOuDeficit >= 0 ? TrendingUp : TrendingDown}
            label={cf.folgaOuDeficit >= 0 ? "Folga Projetada" : "Déficit Projetado"}
            value={formatBRL(Math.abs(cf.folgaOuDeficit))}
            color={cf.folgaOuDeficit >= 0 ? "text-emerald-600" : "text-destructive"}
            sub="Caixa vs compromissos"
          />
          {/* DRE resumo rápido */}
          {dreData && dreData.receitaTotal > 0 && (
            <MetricCard
              icon={BarChart3}
              label="DRE Resumo"
              value={formatBRL(dreData.receitaTotal)}
              color="text-foreground"
              sub={`EBITDA ${formatPercent(pctCalc(dreData.ebitda, dreData.receitaTotal))} · Lucro ${formatBRL(dreData.lucroLiquido)}`}
            />
          )}
        </div>

        {/* DRE Metrics Row */}
        {dreData && dreData.receitaTotal > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Resultado Econômico (DRE)</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <MiniMetric label="Receita" value={formatBRL(dreData.receitaTotal)} />
                <MiniMetric label="CPV" value={formatBRL(dreData.cpv.total)} color="text-destructive" />
                <MiniMetric label="Margem Bruta" value={formatPercent(pctCalc(dreData.margemBruta, dreData.receitaTotal))} color={pctCalc(dreData.margemBruta, dreData.receitaTotal) < 40 ? "text-destructive" : "text-emerald-600"} />
                <MiniMetric label="EBITDA" value={formatPercent(pctCalc(dreData.ebitda, dreData.receitaTotal))} color={dreData.ebitda < 0 ? "text-destructive" : pctCalc(dreData.ebitda, dreData.receitaTotal) < 10 ? "text-amber-600" : "text-emerald-600"} />
                <MiniMetric label="Impostos" value={formatBRL(dreData.impostos.total)} color="text-destructive" />
                <MiniMetric label="Lucro Líquido" value={formatBRL(dreData.lucroLiquido)} color={dreData.lucroLiquido < 0 ? "text-destructive" : "text-emerald-600"} />
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

// ── Severity assessment (reused from council logic, lightweight version) ──

function assessDashboardSeverity(ctx: ReturnType<typeof useCouncilContext>) {
  const reasons: string[] = [];
  let level: "critico" | "alerta" | "atencao" | "normal" = "normal";
  const cf = ctx.cashFlow;

  if (cf.alertLevel === "critico") { level = "critico"; reasons.push(`Déficit de caixa: ${fmtBRL(Math.abs(cf.folgaOuDeficit))}`); }
  else if (cf.alertLevel === "alerta") { if (level === "normal") level = "alerta"; reasons.push(`Caixa apertado — folga de ${fmtBRL(cf.folgaOuDeficit)}`); }
  else if (cf.alertLevel === "atencao") { if (level === "normal") level = "atencao"; reasons.push(`Folga baixa no caixa`); }

  if (cf.totalVencidas > 0) { if (level === "normal") level = "alerta"; reasons.push(`${cf.contasVencidas.length} conta(s) vencida(s)`); }
  if (ctx.belowMinimum.length > 0) { if (level === "normal") level = "atencao"; reasons.push(`${ctx.belowMinimum.length} produto(s) abaixo do mínimo`); }
  if (ctx.pendingApprovals > 0) { reasons.push(`${ctx.pendingApprovals} aprovação(ões) pendente(s)`); }

  const dre = ctx.dre;
  if (dre && dre.receitaTotal > 0) {
    if (dre.lucroLiquido < 0) { level = "critico"; reasons.push(`Lucro líquido negativo: ${fmtBRL(dre.lucroLiquido)}`); }
    else if (pct(dre.ebitda, dre.receitaTotal) < 5) { if (level === "normal") level = "alerta"; reasons.push(`EBITDA apertado: ${pct(dre.ebitda, dre.receitaTotal).toFixed(1)}%`); }
  }

  if (reasons.length === 0) reasons.push("Operação dentro dos parâmetros normais");
  return { level, reasons };
}

function pct(v: number, t: number) { return t ? (v / t) * 100 : 0; }
function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

// ── Components ──

function MetricCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="py-4 px-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        </div>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm font-bold ${color ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}
