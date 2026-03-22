import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useOpProducts,
  useTodayLotes,
  useOccurrences,
  useTodayCounts,
  useScheduledProductions,
} from "@/hooks/use-operational";
import { useAuth } from "@/contexts/AuthContext";
import { AjusteEstoqueDialog } from "@/components/op/AjusteEstoqueDialog";
import { ResetEstoqueDialog } from "@/components/op/ResetEstoqueDialog";
import { AlertTriangle, ArrowDown, Package, TrendingUp, Settings2, RotateCcw } from "lucide-react";

const ROLES_AJUSTE = ["admin", "gestao"];

export default function ResumoOperacional() {
  const { profile } = useAuth();
  const { data: products, isLoading: l1 } = useOpProducts();
  const { data: lotes, isLoading: l2 } = useTodayLotes();
  const { data: occurrences, isLoading: l3 } = useOccurrences();
  const { data: counts, isLoading: l4 } = useTodayCounts();
  const { data: scheduled, isLoading: l5 } = useScheduledProductions();

  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const canAdjust = ROLES_AJUSTE.includes(profile?.role ?? "");

  if (l1 || l2 || l3 || l4 || l5) {
    return (
      <DashboardLayout>
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];

  const totalProduzido = (lotes ?? [])
    .filter((l) => l.status === "concluido")
    .reduce((a, l) => a + Number(l.quantidade), 0);

  const todayOcc = (occurrences ?? []).filter(
    (o) => o.data_solicitacao?.startsWith(todayStr) || o.created_at?.startsWith(todayStr),
  );

  const perdasAprovadas = todayOcc
    .filter((o) => o.tipo_ocorrencia === "perda" && o.status === "aprovado")
    .reduce((a, o) => a + Number(o.quantidade_aprovada ?? 0), 0);

  const degusAprovadas = todayOcc
    .filter((o) => o.tipo_ocorrencia === "degustacao" && o.status === "aprovado")
    .reduce((a, o) => a + Number(o.quantidade_aprovada ?? 0), 0);

  const divergencias = (counts ?? []).filter((c) => c.diferenca !== 0 && c.diferenca !== null);

  const abaixoMinimo = (products ?? []).filter(
    (p) => p.config && p.estoque_atual < (p.config.estoque_minimo ?? 0),
  );

  const pendingApprovals = (occurrences ?? []).filter((o) => o.status === "pendente").length;

  const upcomingScheduled = (scheduled ?? []).filter(
    (s) => s.status === "planejado" || s.status === "em produção",
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Resumo Operacional</h1>
          {canAdjust && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setAjusteOpen(true)}>
                <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                Ajustar Estoque
              </Button>
              <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setResetOpen(true)}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Zerar Tudo
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryCard title="Produzido" value={totalProduzido} icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} />
          <SummaryCard title="Perdas" value={perdasAprovadas} icon={<ArrowDown className="h-4 w-4 text-destructive" />} />
          <SummaryCard title="Degustações" value={degusAprovadas} icon={<Package className="h-4 w-4 text-amber-500" />} />
          <SummaryCard title="Divergências" value={divergencias.length} icon={<AlertTriangle className="h-4 w-4 text-destructive" />} />
        </div>

        {pendingApprovals > 0 && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                ⚠️ {pendingApprovals} aprovação(ões) pendente(s)
              </p>
            </CardContent>
          </Card>
        )}

        {abaixoMinimo.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-destructive">
                Abaixo do Estoque Mínimo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {abaixoMinimo.map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span>{p.nome}</span>
                  <span className="font-medium text-destructive">
                    {p.estoque_atual} / {p.config?.estoque_minimo ?? 0}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {upcomingScheduled.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Programações Ativas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingScheduled.slice(0, 5).map((s) => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span>{s.nome_programacao}</span>
                  <span className="text-muted-foreground">{s.prazo_conclusao}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <AjusteEstoqueDialog open={ajusteOpen} onOpenChange={setAjusteOpen} />
      <ResetEstoqueDialog open={resetOpen} onOpenChange={setResetOpen} />
    </DashboardLayout>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{title}</p>
          {icon}
        </div>
        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
