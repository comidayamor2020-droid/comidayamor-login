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

  const rows = (products ?? [])
    .map((p) => {
      const produzido = produzidoMap.get(p.id) ?? 0;
      const perdas = perdasMap.get(p.id) ?? 0;
      const degus = degusMap.get(p.id) ?? 0;
      const esperado = p.estoque_atual;
      const count = countsMap.get(p.id);
      const contado = count?.estoque_contado ?? null;
      const divergencia = contado !== null ? contado - esperado : null;
      return { ...p, produzido, perdas, degus, esperado, contado, divergencia };
    })
    .filter((r) => r.produzido > 0 || r.contado !== null || r.perdas > 0 || r.degus > 0);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Conciliação</h1>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma movimentação hoje.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <Card
                key={r.id}
                className={r.divergencia && r.divergencia !== 0 ? "border-destructive/50" : ""}
              >
                <CardContent className="p-4">
                  <p className="font-medium text-foreground">{r.nome}</p>
                  <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                    <div>
                      Produzido: <strong>{r.produzido}</strong>
                    </div>
                    <div>
                      Perdas: <strong>{r.perdas}</strong>
                    </div>
                    <div>
                      Degust.: <strong>{r.degus}</strong>
                    </div>
                    <div>
                      Esperado: <strong>{r.esperado}</strong>
                    </div>
                    <div>
                      Contado: <strong>{r.contado ?? "—"}</strong>
                    </div>
                    <div>
                      Diverg.:{" "}
                      {r.divergencia !== null ? (
                        <Badge
                          variant={r.divergencia === 0 ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {r.divergencia > 0 ? "+" : ""}
                          {r.divergencia}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
