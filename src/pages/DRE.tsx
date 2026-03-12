import { formatBRL, formatPercent } from "@/lib/format";
import { useDreData } from "@/hooks/use-dre-data";
import { DashboardLayout } from "@/components/DashboardLayout";

export default function DRE() {
  const { data, isError } = useDreData();

  const rows = data
    ? [
        { label: "Receita Total", value: data.receita_total, percent: null, bold: true },
        { label: "CPV", value: data.cpv, percent: data.cpv_percentual, negative: true },
        { label: "Margem Bruta", value: data.margem_bruta, percent: data.margem_bruta_percentual, bold: true },
        { label: "Despesas Variáveis", value: data.despesas_variaveis, percent: data.despesas_variaveis_percentual, negative: true },
        { label: "Margem de Contribuição", value: data.margem_contribuicao, percent: data.margem_contribuicao_percentual, bold: true },
        { label: "Custos Fixos", value: data.custos_fixos, percent: data.custos_fixos_percentual, negative: true },
        { label: "EBITDA", value: data.ebitda, percent: data.ebitda_percentual, bold: true },
        { label: "Impostos", value: data.impostos, percent: data.impostos_percentual, negative: true },
        { label: "Lucro Líquido", value: data.lucro_liquido, percent: data.lucro_liquido_percentual, bold: true },
      ]
    : [];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          DRE
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Demonstração do Resultado do Exercício
        </p>
      </div>

      {isError && (
        <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar os dados da API. Exibindo valores de exemplo.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Indicador
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Valor (R$)
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Percentual (%)
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.label}
                className={`border-b border-border last:border-0 transition-colors hover:bg-muted/30 ${
                  row.bold ? "bg-muted/20" : ""
                }`}
              >
                <td
                  className={`px-5 py-3 ${
                    row.bold ? "font-semibold text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {row.label}
                </td>
                <td
                  className={`px-5 py-3 text-right tabular-nums ${
                    row.negative
                      ? "text-destructive"
                      : row.bold
                      ? "font-semibold text-foreground"
                      : "text-foreground"
                  }`}
                >
                  {formatBRL(row.value)}
                </td>
                <td
                  className={`px-5 py-3 text-right tabular-nums ${
                    row.negative
                      ? "text-destructive"
                      : row.bold
                      ? "font-semibold text-success"
                      : "text-muted-foreground"
                  }`}
                >
                  {row.percent !== null ? formatPercent(row.percent) : "100.00%"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
