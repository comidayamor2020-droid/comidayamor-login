import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useOpProducts,
  useTodayLotes,
  useRegisterLote,
  useScheduledProductions,
  useUpdateScheduledItem,
  getIdealField,
} from "@/hooks/use-operational";
import { toast } from "sonner";
import { Plus, Check, Calendar, Package, ClipboardList, Pencil, CheckCircle2 } from "lucide-react";

type EditingItem = {
  id: string;
  produto_id: string;
  quantidade_total: number;
  quantidade_produzida: number;
  status: string;
};

export default function ProducaoDia() {
  const { data: products, isLoading: l1 } = useOpProducts();
  const { data: lotes, isLoading: l2 } = useTodayLotes();
  const { data: scheduled } = useScheduledProductions();
  const registerLote = useRegisterLote();
  const updateItem = useUpdateScheduledItem();

  const [producing, setProducing] = useState<string | null>(null);
  const [qty, setQty] = useState("");

  // Edit dialog state
  const [editItem, setEditItem] = useState<EditingItem | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editStatus, setEditStatus] = useState("");

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

  const lotesMap = new Map<string, number>();
  for (const l of lotes ?? []) {
    if (l.status === "concluido") {
      lotesMap.set(l.produto_id, (lotesMap.get(l.produto_id) ?? 0) + Number(l.quantidade));
    }
  }

  const handleRegister = async (produtoId: string) => {
    const q = Number(qty);
    if (!q || q <= 0) { toast.error("Informe uma quantidade válida"); return; }
    try {
      await registerLote.mutateAsync({ produto_id: produtoId, quantidade: q, status: "concluido" });
      toast.success("Lote registrado!");
      setProducing(null);
      setQty("");
    } catch { toast.error("Erro ao registrar lote"); }
  };

  const openEdit = (item: EditingItem) => {
    setEditItem(item);
    setEditQty(String(item.quantidade_produzida));
    setEditStatus(item.status);
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    const produzida = Number(editQty);
    if (isNaN(produzida) || produzida < 0) {
      toast.error("Quantidade produzida inválida");
      return;
    }
    if (produzida > editItem.quantidade_total) {
      toast.error(`Quantidade produzida não pode ultrapassar o total (${editItem.quantidade_total})`);
      return;
    }
    // Auto-resolve status based on quantity
    let status = editStatus;
    if (produzida >= editItem.quantidade_total) {
      status = "concluido";
    } else if (produzida > 0) {
      status = "em_producao";
    } else {
      status = "planejado";
    }
    try {
      await updateItem.mutateAsync({
        id: editItem.id,
        quantidade_produzida: produzida,
        quantidade_total: editItem.quantidade_total,
        status,
      });
      toast.success("Item atualizado!");
      setEditItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      console.error("Erro ao salvar item programado:", err);
      toast.error(msg);
    }
  };

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  // Split scheduled into open vs done
  const allScheduled = scheduled ?? [];
  const openScheduled = allScheduled.filter(
    (s) => s.status !== "concluido" && s.status !== "cancelado"
  );
  const doneScheduled = allScheduled.filter(
    (s) => s.status === "concluido"
  );

  const renderProgCard = (prog: (typeof allScheduled)[number], showEditAction: boolean) => (
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
                  {showEditAction && (
                    <th className="text-right p-2 font-medium text-muted-foreground">Ação</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {prog.itens.map((item) => {
                  const prod = productMap.get(item.produto_id);
                  const pendente = Math.max(0, item.quantidade_pendente ?? (item.quantidade_total - item.quantidade_produzida));
                  return (
                    <tr key={item.id} className="border-t border-border">
                      <td className="p-2 text-foreground">{prod?.nome ?? "—"}</td>
                      <td className="p-2 text-center">{item.quantidade_total}</td>
                      <td className="p-2 text-center text-emerald-600">{item.quantidade_produzida}</td>
                      <td className="p-2 text-center font-semibold text-primary">{pendente}</td>
                      <td className="p-2 text-center">
                        <Badge variant="outline" className="text-xs">{item.status}</Badge>
                      </td>
                      {showEditAction && item.status !== "concluido" && item.status !== "cancelado" && (
                        <td className="p-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil className="mr-1 h-3 w-3" /> Editar
                          </Button>
                        </td>
                      )}
                      {showEditAction && (item.status === "concluido" || item.status === "cancelado") && (
                        <td className="p-2 text-right">
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> {item.status}
                          </Badge>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );

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
                          <Button size="sm" variant="outline" onClick={() => { setProducing(p.id); setQty(String(sugerido || "")); }}>
                            <Plus className="mr-1 h-3 w-3" /> Produzir
                          </Button>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
                        <div><p className="text-muted-foreground">Estoque</p><p className="font-semibold">{atual}</p></div>
                        <div><p className="text-muted-foreground">Ideal</p><p className="font-semibold">{ideal}</p></div>
                        <div><p className="text-muted-foreground">Sugerido</p><p className={`font-semibold ${sugerido > 0 ? "text-primary" : ""}`}>{sugerido}</p></div>
                        <div><p className="text-muted-foreground">Produzido</p><p className="font-semibold text-emerald-600">{produzidoHoje}</p></div>
                      </div>
                      {producing === p.id && (
                        <div className="mt-3 flex gap-2">
                          <Input type="number" placeholder="Qtd" value={qty} onChange={(e) => setQty(e.target.value)} className="w-24" />
                          <Button size="sm" onClick={() => handleRegister(p.id)} disabled={registerLote.isPending}>
                            <Check className="mr-1 h-3 w-3" /> Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setProducing(null)}>Cancelar</Button>
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
            <Tabs defaultValue="abertos" className="w-full">
              <TabsList className="w-full mb-3">
                <TabsTrigger value="abertos" className="flex-1">Em Aberto ({openScheduled.length})</TabsTrigger>
                <TabsTrigger value="concluidos" className="flex-1">Concluídos ({doneScheduled.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="abertos">
                <div className="space-y-4">
                  {openScheduled.length === 0 && (
                    <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma programação em aberto.</p>
                  )}
                  {openScheduled.map((prog) => renderProgCard(prog, true))}
                </div>
              </TabsContent>

              <TabsContent value="concluidos">
                <div className="space-y-4">
                  {doneScheduled.length === 0 && (
                    <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma programação concluída.</p>
                  )}
                  {doneScheduled.map((prog) => renderProgCard(prog, false))}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialog de Edição ── */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Item Programado</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {productMap.get(editItem.produto_id)?.nome ?? "Produto"}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Total</p>
                  <p className="font-semibold">{editItem.quantidade_total}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Produzido</p>
                  <Input
                    type="number"
                    min={0}
                    max={editItem.quantidade_total}
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="text-center"
                  />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Pendente</p>
                  <p className="font-semibold text-primary">
                    {Math.max(0, editItem.quantidade_total - (Number(editQty) || 0))}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planejado">Planejado</SelectItem>
                    <SelectItem value="em_producao">Em Produção</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateItem.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
