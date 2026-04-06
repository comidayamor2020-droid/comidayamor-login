import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useOpProducts,
  useTodayLotes,
  useTodayCounts,
  useRegisterLote,
  useScheduledProductions,
  useUpdateScheduledItem,
  getIdealField,
} from "@/hooks/use-operational";
import { getIdealForToday } from "@/lib/operational";
import { toast } from "sonner";
import { Package, ClipboardList, Pencil, CheckCircle2, Calendar, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

type EditingItem = {
  id: string;
  produto_id: string;
  quantidade_total: number;
  quantidade_produzida: number;
  programacao_id: string;
};

export default function ProducaoDia() {
  const { data: products, isLoading: l1 } = useOpProducts();
  const { data: lotes, isLoading: l2 } = useTodayLotes();
  const { data: todayCounts } = useTodayCounts();
  const { data: scheduled } = useScheduledProductions();
  const registerLote = useRegisterLote();
  const updateItem = useUpdateScheduledItem();

  const [producing, setProducing] = useState<string | null>(null);
  const [qty, setQty] = useState("");
  const [obs, setObs] = useState("");

  const [editItem, setEditItem] = useState<EditingItem | null>(null);
  const [editQty, setEditQty] = useState("");

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

  // Map product counts from Estoque da Loja (today)
  const countsMap = new Map(
    (todayCounts ?? []).map((c) => [c.produto_id, Number(c.estoque_contado)])
  );

  // Map produced today (completed lotes)
  const lotesMap = new Map<string, number>();
  for (const l of lotes ?? []) {
    if (l.status === "concluido") {
      lotesMap.set(l.produto_id, (lotesMap.get(l.produto_id) ?? 0) + Number(l.quantidade));
    }
  }

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  // Compute daily data per product
  const dailyData = (products ?? []).map((p) => {
    const config = p.config as Record<string, unknown> | null;
    const ideal = config ? Number(config[idealField] ?? 0) : 0;
    const estoqueContado = countsMap.get(p.id);
    const hasCount = estoqueContado !== undefined;
    const contado = estoqueContado ?? p.estoque_atual;
    const proposto = Math.max(0, ideal - contado);
    const produzido = lotesMap.get(p.id) ?? 0;
    const diferenca = produzido - proposto;

    let status: "nao_precisa" | "falta" | "atingido" | "excesso";
    if (proposto === 0) status = "nao_precisa";
    else if (produzido < proposto) status = "falta";
    else if (produzido === proposto) status = "atingido";
    else status = "excesso";

    if (import.meta.env.DEV) {
      console.log(`[ProducaoDia] ${p.nome}: field=${idealField}, ideal=${ideal}, contado=${contado}, proposto=${proposto}, produzido=${produzido}`);
    }

    return { ...p, ideal, contado, hasCount, proposto, produzido, diferenca, status };
  });

  const handleRegister = async (produtoId: string) => {
    const q = Number(qty);
    if (!q || q <= 0) {
      toast.error("Informe uma quantidade válida");
      return;
    }

    const item = dailyData.find((d) => d.id === produtoId);
    if (!item) return;

    const novoProduzido = item.produzido + q;
    const novaDiferenca = novoProduzido - item.proposto;
    const needsObs = novaDiferenca !== 0 && item.proposto > 0;

    if (needsObs && !obs.trim()) {
      toast.error("Observação obrigatória quando produzido difere do proposto");
      return;
    }

    try {
      await registerLote.mutateAsync({
        produto_id: produtoId,
        quantidade: q,
        status: "concluido",
        observacao: obs.trim() || undefined,
      });
      toast.success("Produção registrada!");
      setProducing(null);
      setQty("");
      setObs("");
    } catch {
      toast.error("Erro ao registrar produção");
    }
  };

  // ── Pedidos Programados ──
  const openEdit = (item: any) => {
    setEditItem({
      id: item.id,
      produto_id: item.produto_id,
      quantidade_total: item.quantidade_total,
      quantidade_produzida: item.quantidade_produzida,
      programacao_id: item.programacao_id,
    });
    setEditQty(String(item.quantidade_produzida));
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    const produzida = Number(editQty);
    if (isNaN(produzida) || produzida < 0) {
      toast.error("Quantidade produzida inválida");
      return;
    }
    if (produzida > editItem.quantidade_total) {
      toast.error(`Quantidade não pode ultrapassar o total (${editItem.quantidade_total})`);
      return;
    }
    try {
      await updateItem.mutateAsync({
        id: editItem.id,
        quantidade_produzida: produzida,
        quantidade_total: editItem.quantidade_total,
        programacao_id: editItem.programacao_id,
      });
      toast.success("Item atualizado!");
      setEditItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(msg);
    }
  };

  const allScheduled = scheduled ?? [];
  const openScheduled = allScheduled.filter((s) => s.status !== "concluido" && s.status !== "cancelado");
  const doneScheduled = allScheduled.filter((s) => s.status === "concluido");

  const statusCardClass = (status: string) => {
    switch (status) {
      case "nao_precisa": return "";
      case "falta": return "border-destructive/50 bg-destructive/5 dark:bg-destructive/10";
      case "atingido": return "border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10";
      case "excesso": return "border-emerald-500/60 bg-emerald-50/50 dark:bg-emerald-950/20";
      default: return "";
    }
  };

  const statusBadge = (status: string, diferenca: number) => {
    switch (status) {
      case "nao_precisa":
        return <Badge variant="secondary" className="text-xs">Não precisa produzir</Badge>;
      case "falta":
        return <Badge variant="destructive" className="text-xs">Falta produzir ({Math.abs(diferenca)})</Badge>;
      case "atingido":
        return (
          <Badge className="text-xs bg-emerald-600 text-white border-emerald-600">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Objetivo atingido
          </Badge>
        );
      case "excesso":
        return (
          <Badge className="text-xs bg-emerald-600 text-white border-emerald-600">
            <AlertCircle className="mr-1 h-3 w-3" /> Acima do proposto (+{diferenca})
          </Badge>
        );
      default:
        return null;
    }
  };

  const renderProgCard = (prog: (typeof allScheduled)[number], showEditAction: boolean) => {
    const isProgDone = prog.status === "concluido";
    return (
      <Card key={prog.id} className={isProgDone ? "border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10" : ""}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-foreground">{prog.nome_programacao}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs">{prog.tipo}</Badge>
                <Badge variant={prog.prioridade === "urgente" ? "destructive" : "secondary"} className="text-xs">{prog.prioridade}</Badge>
                <Badge variant="outline" className="text-xs">
                  <Calendar className="mr-1 h-3 w-3" />
                  {new Date(prog.prazo_conclusao + "T00:00:00").toLocaleDateString("pt-BR")}
                </Badge>
              </div>
            </div>
            {isProgDone ? (
              <Badge className="text-xs bg-emerald-600 text-white border-emerald-600">
                <CheckCircle2 className="mr-1 h-3 w-3" /> concluido
              </Badge>
            ) : (
              <Badge variant={prog.status === "planejado" ? "secondary" : "default"} className="text-xs">{prog.status}</Badge>
            )}
          </div>
          {prog.observacao && (
            <div className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 whitespace-pre-wrap">
              <span className="font-medium text-foreground">Observação:</span> {prog.observacao}
            </div>
          )}
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
                    {showEditAction && <th className="text-right p-2 font-medium text-muted-foreground">Ação</th>}
                  </tr>
                </thead>
                <tbody>
                  {prog.itens.map((item) => {
                    const prod = productMap.get(item.produto_id);
                    const pendente = Math.max(0, item.quantidade_total - item.quantidade_produzida);
                    const isItemDone = item.status === "concluido";
                    return (
                      <tr key={item.id} className={`border-t border-border ${isItemDone ? "bg-emerald-50/50 dark:bg-emerald-950/10" : ""}`}>
                        <td className="p-2 text-foreground">{prod?.nome ?? "—"}</td>
                        <td className="p-2 text-center">{item.quantidade_total}</td>
                        <td className={`p-2 text-center ${isItemDone ? "text-emerald-600 font-semibold" : ""}`}>{item.quantidade_produzida}</td>
                        <td className="p-2 text-center font-semibold text-primary">{pendente}</td>
                        <td className="p-2 text-center">
                          {isItemDone ? (
                            <Badge className="text-xs bg-emerald-600 text-white border-emerald-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> concluido
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">{item.status}</Badge>
                          )}
                        </td>
                        {showEditAction && (
                          <td className="p-2 text-right">
                            {item.status !== "concluido" && item.status !== "cancelado" ? (
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openEdit(item)}>
                                <Pencil className="mr-1 h-3 w-3" /> Editar
                              </Button>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <CheckCircle2 className="mr-1 h-3 w-3" /> {item.status}
                              </Badge>
                            )}
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
  };

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
              {dailyData.map((item) => (
                <Card key={item.id} className={statusCardClass(item.status)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{item.nome}</p>
                        <p className="text-xs text-muted-foreground">{item.categoria}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(item.status, item.diferenca)}
                      </div>
                    </div>

                    {!item.hasCount && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-3 w-3" />
                        <span>Sem contagem hoje — usando estoque do sistema</span>
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs">
                      <div>
                        <p className="text-muted-foreground">Estoque Loja</p>
                        <p className="font-semibold">{item.contado}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ideal</p>
                        <p className="font-semibold">{item.ideal}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Proposto</p>
                        <p className={`font-semibold ${item.proposto > 0 && item.status === "falta" ? "text-destructive" : ""}`}>{item.proposto}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Produzido</p>
                        <p className={`font-semibold ${item.status === "atingido" || item.status === "excesso" ? "text-emerald-600" : ""}`}>{item.produzido}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Diferença</p>
                        <p className={`font-semibold ${item.diferenca > 0 ? "text-emerald-600" : item.diferenca < 0 ? "text-destructive" : ""}`}>
                          {item.diferenca > 0 ? `+${item.diferenca}` : item.diferenca}
                        </p>
                      </div>
                    </div>

                    {/* Production input */}
                    {producing === item.id ? (
                      <div className="mt-3 space-y-2 rounded-md border border-border p-3 bg-muted/30">
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Quantidade"
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                            className="w-28"
                            min={1}
                          />
                          <div className="text-xs text-muted-foreground self-center">
                            {qty && Number(qty) > 0 && (
                              <span>
                                Novo total: <strong>{item.produzido + Number(qty)}</strong>
                                {" "}(dif: {item.produzido + Number(qty) - item.proposto > 0 ? "+" : ""}
                                {item.produzido + Number(qty) - item.proposto})
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Show obs requirement */}
                        {item.proposto > 0 && qty && Number(qty) > 0 && (item.produzido + Number(qty)) !== item.proposto && (
                          <div className="space-y-1">
                            <p className="text-xs text-destructive font-medium flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Observação obrigatória
                            </p>
                            <Textarea
                              placeholder="Ex: faltou insumo, pedido da gerência, aproveitamento de base pronta..."
                              value={obs}
                              onChange={(e) => setObs(e.target.value)}
                              className="text-sm"
                              rows={2}
                            />
                          </div>
                        )}
                        {/* Optional obs when equal */}
                        {(item.proposto === 0 || !qty || Number(qty) <= 0 || (item.produzido + Number(qty)) === item.proposto) && (
                          <Textarea
                            placeholder="Observação (opcional)"
                            value={obs}
                            onChange={(e) => setObs(e.target.value)}
                            className="text-sm"
                            rows={2}
                          />
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleRegister(item.id)} disabled={registerLote.isPending}>
                            Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setProducing(null); setQty(""); setObs(""); }}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant={item.status === "falta" ? "default" : "outline"}
                          onClick={() => {
                            setProducing(item.id);
                            setQty(item.status === "falta" ? String(item.proposto - item.produzido) : "");
                            setObs("");
                          }}
                        >
                          Registrar Produção
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
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

      {/* ── Dialog de Edição (Pedidos Programados) ── */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Item Programado</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">
                {productMap.get(editItem.produto_id)?.nome ?? "Produto"}
              </p>
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
                <p className="text-xs text-muted-foreground mb-1">Status (automático)</p>
                {(() => {
                  const q = Number(editQty) || 0;
                  const t = editItem.quantidade_total;
                  const autoStatus = q >= t ? "concluido" : q > 0 ? "em_producao" : "planejado";
                  const label = autoStatus === "concluido" ? "Concluído" : autoStatus === "em_producao" ? "Em Produção" : "Planejado";
                  const badgeClass = autoStatus === "concluido"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : autoStatus === "em_producao"
                    ? "bg-primary text-primary-foreground"
                    : "";
                  return <Badge variant={autoStatus === "planejado" ? "secondary" : "default"} className={`text-xs ${badgeClass}`}>{label}</Badge>;
                })()}
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
