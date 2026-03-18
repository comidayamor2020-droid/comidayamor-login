import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOpProducts, useTodayLotes, useRegisterLote, useScheduledProductions, getIdealField } from "@/hooks/use-operational";
import { toast } from "sonner";
import { Plus, Check, Calendar, Package, ClipboardList } from "lucide-react";

export default function ProducaoDia() {
  const { data: products, isLoading: l1 } = useOpProducts();
  const { data: lotes, isLoading: l2 } = useTodayLotes();
  const { data: scheduled } = useScheduledProductions();
  const registerLote = useRegisterLote();
  const [producing, setProducing] = useState<string | null>(null);
  const [qty, setQty] = useState("");

  const idealField = getIdealField();

  if (l1 || l2) {
    return (
      <DashboardLayout>
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Map produced today per product
  const lotesMap = new Map<string, number>();
  for (const l of lotes ?? []) {
    if (l.status === "concluido") {
      lotesMap.set(l.produto_id, (lotesMap.get(l.produto_id) ?? 0) + Number(l.quantidade));
    }
  }

  const handleRegister = async (produtoId: string) => {
    const q = Number(qty);
    if (!q || q <= 0) {
      toast.error("Informe uma quantidade válida");
      return;
    }
    try {
      await registerLote.mutateAsync({ produto_id: produtoId, quantidade: q, status: "concluido" });
      toast.success("Lote registrado!");
      setProducing(null);
      setQty("");
    } catch {
      toast.error("Erro ao registrar lote");
    }
  };

  // Scheduled items grouped by programacao
  const pendingScheduled = (scheduled ?? []).filter(
    (s) => s.status === "planejado" || s.status === "em produção"
  );

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Produção do Dia</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>

        <Tabs defaultValue="estoque" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="estoque" className="flex-1 gap-1">
              <Package className="h-4 w-4" /> Estoque Diário
            </TabsTrigger>
            <TabsTrigger value="programados" className="flex-1 gap-1">
              <ClipboardList className="h-4 w-4" /> Pedidos Programados
            </TabsTrigger>
            {/* Future: <TabsTrigger value="b2b">Produção B2B</TabsTrigger> */}
          </TabsList>

          {/* ── Aba Estoque Diário ── */}
          <TabsContent value="estoque">
            <div className="space-y-3">
              {(products ?? []).map((p) => {
                const ideal = p.config ? Number((p.config as Record<string, unknown>)[idealField] ?? 0) : 0;
                const atual = p.estoque_atual;
                const produzidoHoje = lotesMap.get(p.id) ?? 0;
                const sugerido = Math.max(0, ideal - atual);

                return (
                  <Card key={p.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-foreground">{p.nome}</p>
                          <p className="text-xs text-muted-foreground">{p.categoria}</p>
                        </div>
                        {producing !== p.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setProducing(p.id);
                              setQty(String(sugerido || ""));
                            }}
                          >
                            <Plus className="mr-1 h-3 w-3" /> Produzir
                          </Button>
                        )}
                      </div>

                      <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
                        <div>
                          <p className="text-muted-foreground">Estoque</p>
                          <p className="font-semibold">{atual}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ideal</p>
                          <p className="font-semibold">{ideal}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Sugerido</p>
                          <p className={`font-semibold ${sugerido > 0 ? "text-primary" : ""}`}>{sugerido}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Produzido</p>
                          <p className="font-semibold text-emerald-600">{produzidoHoje}</p>
                        </div>
                      </div>

                      {producing === p.id && (
                        <div className="mt-3 flex gap-2">
                          <Input
                            type="number"
                            placeholder="Qtd"
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                            className="w-24"
                          />
                          <Button size="sm" onClick={() => handleRegister(p.id)} disabled={registerLote.isPending}>
                            <Check className="mr-1 h-3 w-3" /> Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setProducing(null)}>
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Aba Pedidos Programados ── */}
          <TabsContent value="programados">
            <div className="space-y-4">
              {pendingScheduled.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma programação pendente.</p>
              )}
              {pendingScheduled.map((prog) => (
                <Card key={prog.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{prog.nome_programacao}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">{prog.tipo}</Badge>
                          <Badge
                            variant={prog.prioridade === "urgente" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {prog.prioridade}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="mr-1 h-3 w-3" />
                            {new Date(prog.prazo_conclusao + "T00:00:00").toLocaleDateString("pt-BR")}
                          </Badge>
                        </div>
                      </div>
                      <Badge variant={prog.status === "planejado" ? "secondary" : "default"} className="text-xs">
                        {prog.status}
                      </Badge>
                    </div>

                    {prog.itens.length > 0 && (
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-2 font-medium text-muted-foreground">Produto</th>
                              <th className="text-center p-2 font-medium text-muted-foreground">Total</th>
                              <th className="text-center p-2 font-medium text-muted-foreground">Produzido</th>
                              <th className="text-center p-2 font-medium text-muted-foreground">Pendente</th>
                              <th className="text-center p-2 font-medium text-muted-foreground">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {prog.itens.map((item) => {
                              const prod = productMap.get(item.produto_id);
                              const pendente = item.quantidade_pendente ?? (item.quantidade_total - item.quantidade_produzida);
                              return (
                                <tr key={item.id} className="border-t border-border">
                                  <td className="p-2 text-foreground">{prod?.nome ?? "—"}</td>
                                  <td className="p-2 text-center">{item.quantidade_total}</td>
                                  <td className="p-2 text-center text-emerald-600">{item.quantidade_produzida}</td>
                                  <td className="p-2 text-center font-semibold text-primary">{pendente}</td>
                                  <td className="p-2 text-center">
                                    <Badge variant="outline" className="text-xs">{item.status}</Badge>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Future: B2B tab content */}
          {/* <TabsContent value="b2b">...</TabsContent> */}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
