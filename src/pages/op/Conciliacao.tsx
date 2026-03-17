import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOpProducts, useTodayLotes, useTodayCounts, useOccurrences } from "@/hooks/use-operational";

export default function Conciliacao() {
  const { data: products, isLoading: l1 } = useOpProducts();
  const { data: lotes, isLoading: l2 } = useTodayLotes();
  const { data: counts, isLoading: l3 } = useTodayCounts();
  const { data: occurrences, isLoading: l4 } = useOccurrences("aprovado");

  if (l1 || l2 || l3 || l4) {
    return (
      <DashboardLayout>
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const produzidoMap = new Map<string, number>();
  for (const l of lotes ?? []) {
    if (l.status === "concluido") {
      produzidoMap.set(l.produto_id, (produzidoMap.get(l.produto_id) ?? 0) + Number(l.quantidade));
    }
  }

  const countsMap = new Map((counts ?? []).map((c) => [c.produto_id, c]));

  const perdasMap = new Map<string, number>();
  const degusMap = new Map<string, number>();
  for (const o of occurrences ?? []) {
    const map = o.tipo_ocorrencia === "perda" ? perdasMap : degusMap;
    map.set(o.produto_id, (map.get(o.produto_id) ?? 0) + Number(o.quantidade_aprovada ?? 0));
  }

  // For conciliation: estoque_inicial = estoque_atual (start of day snapshot)
  // estoque esperado = estoque_inicial + produzido - vendido - perdas - degustações
  // Note: "vendido" data not available from op_ tables, shown as 0
  const rows = (products ?? []).map((p) => {
    const estoqueInicial = p.estoque_atual; // current consolidated stock
    const produzido = produzidoMap.get(p.id) ?? 0;
    const perdas = perdasMap.get(p.id) ?? 0;
    const degus = degusMap.get(p.id) ?? 0;
    const vendido = 0; // vendas data not in op_ tables
    const esperado = estoqueInicial + produzido - vendido - perdas - degus;
    const count = countsMap.get(p.id);
    const contado = count?.estoque_contado ?? null;
    const divergencia = contado !== null ? Number(contado) - esperado : null;
    return { ...p, estoqueInicial, produzido, vendido, perdas, degus, esperado, contado, divergencia };
  });

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Conciliação</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>

        {/* Table for desktop, cards for mobile */}
        <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Produto</th>
                <th className="px-3 py-2 text-right font-medium">Est. Inicial</th>
                <th className="px-3 py-2 text-right font-medium">Produzido</th>
                <th className="px-3 py-2 text-right font-medium">Vendido</th>
                <th className="px-3 py-2 text-right font-medium">Perdas</th>
                <th className="px-3 py-2 text-right font-medium">Degust.</th>
                <th className="px-3 py-2 text-right font-medium">Esperado</th>
                <th className="px-3 py-2 text-right font-medium">Contado</th>
                <th className="px-3 py-2 text-right font-medium">Diverg.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-border/50 ${r.divergencia && r.divergencia !== 0 ? "bg-destructive/5" : ""}`}
                >
                  <td className="px-3 py-2 font-medium text-foreground">{r.nome}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.estoqueInicial}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-600">{r.produzido}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.vendido}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-destructive">{r.perdas}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber-600">{r.degus}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{r.esperado}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.contado ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    {r.divergencia !== null ? (
                      <Badge variant={r.divergencia === 0 ? "secondary" : "destructive"} className="text-xs">
                        {r.divergencia > 0 ? "+" : ""}{r.divergencia}
                      </Badge>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {rows.map((r) => (
            <Card
              key={r.id}
              className={r.divergencia && r.divergencia !== 0 ? "border-destructive/50" : ""}
            >
              <CardContent className="p-4">
                <p className="font-medium text-foreground">{r.nome}</p>
                <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                  <div>Est. Inicial: <strong>{r.estoqueInicial}</strong></div>
                  <div>Produzido: <strong className="text-emerald-600">{r.produzido}</strong></div>
                  <div>Vendido: <strong>{r.vendido}</strong></div>
                  <div>Perdas: <strong className="text-destructive">{r.perdas}</strong></div>
                  <div>Degust.: <strong className="text-amber-600">{r.degus}</strong></div>
                  <div>Esperado: <strong>{r.esperado}</strong></div>
                  <div>Contado: <strong>{r.contado ?? "—"}</strong></div>
                  <div>
                    Diverg.:{" "}
                    {r.divergencia !== null ? (
                      <Badge variant={r.divergencia === 0 ? "secondary" : "destructive"} className="text-xs">
                        {r.divergencia > 0 ? "+" : ""}{r.divergencia}
                      </Badge>
                    ) : "—"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
