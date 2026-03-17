import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useOpProducts, useTodayLotes, useRegisterLote, useScheduledProductions, getIdealField } from "@/hooks/use-operational";
import { toast } from "sonner";
import { Plus, Check, Calendar } from "lucide-react";

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

  // Map pending scheduled items per product
  const scheduledMap = new Map<string, { nome: string; pendente: number }[]>();
  for (const s of scheduled ?? []) {
    if (s.status === "planejado" || s.status === "em produção") {
      for (const item of s.itens) {
        if ((item.quantidade_pendente ?? 0) > 0) {
          const list = scheduledMap.get(item.produto_id) ?? [];
          list.push({ nome: s.nome_programacao, pendente: Number(item.quantidade_pendente ?? 0) });
          scheduledMap.set(item.produto_id, list);
        }
      }
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

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Produção do Dia</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>

        <div className="space-y-3">
          {(products ?? []).map((p) => {
            const ideal = p.config ? Number((p.config as Record<string, unknown>)[idealField] ?? 0) : 0;
            const atual = p.estoque_atual;
            const produzidoHoje = lotesMap.get(p.id) ?? 0;
            const sugerido = Math.max(0, ideal - atual);
            const pendingScheduled = scheduledMap.get(p.id);

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

                  {/* Pending scheduled productions */}
                  {pendingScheduled && pendingScheduled.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {pendingScheduled.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <Calendar className="h-3 w-3 text-amber-500" />
                          <span className="text-muted-foreground">{s.nome}:</span>
                          <Badge variant="outline" className="text-xs">{s.pendente} pend.</Badge>
                        </div>
                      ))}
                    </div>
                  )}

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
      </div>
    </DashboardLayout>
  );
}
