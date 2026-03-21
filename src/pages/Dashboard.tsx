import { formatBRL, formatPercent } from "@/lib/format";
import { useDreData } from "@/hooks/use-dre-data";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useCaixaDisponivel } from "@/hooks/use-caixa";
import { Wallet } from "lucide-react";
import { format } from "date-fns";

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  variant: "neutral" | "cost" | "profit";
}

function MetricCard({ title, value, description, variant }: MetricCardProps) {
  const colorClass =
    variant === "cost" ? "text-destructive" : variant === "profit" ? "text-success" : "text-foreground";

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${colorClass}`}>{value}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function Dashboard() {
  const { data, isError } = useDreData();
  const { data: caixa } = useCaixaDisponivel();

  const pctCalc = (v: number, t: number) => (t ? (v / t) * 100 : 0);

  const metrics: MetricCardProps[] = data
    ? [
        {
          title: "Receita Total",
          value: formatBRL(data.receitaTotal),
          description: "Total de receitas no período",
          variant: "neutral",
        },
        {
          title: "CPV",
          value: formatBRL(data.cpv.total),
          description: "Custo dos produtos vendidos",
          variant: "cost",
        },
        {
          title: "Margem Bruta %",
          value: formatPercent(pctCalc(data.margemBruta, data.receitaTotal)),
          description: "Receita menos custo dos produtos",
          variant: "profit",
        },
        {
          title: "Margem de Contribuição %",
          value: formatPercent(pctCalc(data.margemContribuicao, data.receitaTotal)),
          description: "Margem após despesas variáveis",
          variant: "profit",
        },
        {
          title: "EBITDA %",
          value: formatPercent(pctCalc(data.ebitda, data.receitaTotal)),
          description: "Lucro antes de juros, impostos e depreciação",
          variant: "profit",
        },
        {
          title: "Lucro Líquido %",
          value: formatPercent(pctCalc(data.lucroLiquido, data.receitaTotal)),
          description: "Resultado final após todas as deduções",
          variant: "profit",
        },
      ]
    : [];
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Resumo financeiro do período</p>
      </div>

      {isError && (
        <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar os dados da API. Exibindo valores de exemplo.
        </div>
      )}

      {/* Caixa Disponível */}
      {caixa && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-5 flex items-center gap-4">
          <Wallet className="h-6 w-6 text-primary shrink-0" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Caixa Disponível</p>
            <p className="text-2xl font-bold text-foreground">{formatBRL(caixa.valor)}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[11px] text-muted-foreground">
              Atualizado em {format(new Date(caixa.created_at), "dd/MM/yyyy 'às' HH:mm")}
            </p>
            {caixa.autor_nome && <p className="text-[11px] text-muted-foreground">por {caixa.autor_nome}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <MetricCard key={m.title} {...m} />
        ))}
      </div>
    </DashboardLayout>
  );
}
