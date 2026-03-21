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

  const metrics: MetricCardProps[] = data
    ? [
        {
          title: "Receita Total",
          value: formatBRL(data.receita_total),
          description: "Total de receitas no período",
          variant: "neutral",
        },
        {
          title: "CPV",
          value: formatBRL(data.cpv),
          description: "Custo dos produtos vendidos",
          variant: "cost",
        },
        {
          title: "Margem Bruta %",
          value: formatPercent(data.margem_bruta_percentual),
          description: "Receita menos custo dos produtos",
          variant: "profit",
        },
        {
          title: "Margem de Contribuição %",
          value: formatPercent(data.margem_contribuicao_percentual),
          description: "Margem após despesas variáveis",
          variant: "profit",
        },
        {
          title: "EBITDA %",
          value: formatPercent(data.ebitda_percentual),
          description: "Lucro antes de juros, impostos e depreciação",
          variant: "profit",
        },
        {
          title: "Lucro Líquido %",
          value: formatPercent(data.lucro_liquido_percentual),
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <MetricCard key={m.title} {...m} />
        ))}
      </div>
    </DashboardLayout>
  );
}
