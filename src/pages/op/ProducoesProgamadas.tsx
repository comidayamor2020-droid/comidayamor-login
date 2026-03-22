import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useScheduledProductions, useOpProducts, useCreateScheduled,
  useUpdateScheduledItem, useDeleteScheduledProduction,
  useDeleteScheduledItem, useUpdateScheduledProduction,
} from "@/hooks/use-operational";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  planejado: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "em produção": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "em_producao": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  concluido: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  atrasado: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cancelado: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

const MASTER_ROLES = ["admin", "gestao"];

export default function ProducoesProgamadas() {
  const { profile } = useAuth();
  const { data: scheduled, isLoading } = useScheduledProductions();
  const { data: products } = useOpProducts();
  const createScheduled = useCreateScheduled();
  const updateItem = useUpdateScheduledItem();
  const deleteProd = useDeleteScheduledProduction();
  const deleteItem = useDeleteScheduledItem();
  const updateProd = useUpdateScheduledProduction();

  const isMaster = MASTER_ROLES.includes(profile?.role ?? "");

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    nome_programacao: "", tipo: "evento", prazo_conclusao: "",
    prioridade: "media", observacao: "",
    itens: [] as { produto_id: string; quantidade_total: number }[],
  });

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState({ nome_programacao: "", tipo: "", prazo_conclusao: "", prioridade: "", status: "", observacao: "" });

  // Delete confirmations
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "production" | "item"; id: string; nome: string; programacao_id?: string } | null>(null);

  if (isLoading) {
    return <DashboardLayout><div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" /></div></DashboardLayout>;
  }

  const productMap = new Map((products ?? []).map((p) => [p.id, p.nome]));

  const handleCreate = async () => {
    if (!form.nome_programacao) { toast.error("Nome da programação é obrigatório"); return; }
    if (!form.prazo_conclusao) { toast.error("Prazo de conclusão é obrigatório"); return; }
    if (form.itens.length === 0) { toast.error("Adicione pelo menos um item"); return; }
    for (const item of form.itens) {
      if (!item.produto_id) { toast.error("Cada item precisa de um produto válido"); return; }
      if (!item.quantidade_total || item.quantidade_total <= 0) { toast.error("A quantidade de cada item deve ser maior que 0"); return; }
    }
    try {
      await createScheduled.mutateAsync({ ...form, prazo_conclusao: form.prazo_conclusao });
      toast.success("Programação criada!");
      setShowCreate(false);
      setForm({ nome_programacao: "", tipo: "evento", prazo_conclusao: "", prioridade: "media", observacao: "", itens: [] });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao criar programação");
    }
  };

  const addItem = () => {
    const first = products?.[0];
    if (!first) return;
    setForm((f) => ({ ...f, itens: [...f.itens, { produto_id: first.id, quantidade_total: 1 }] }));
  };

  const removeItem = (idx: number) => {
    setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }));
  };

  const handleUpdateProgress = async (item: { id: string; quantidade_produzida: number; quantidade_total: number; programacao_id: string }, newProduced: number) => {
    try {
      await updateItem.mutateAsync({ id: item.id, quantidade_produzida: newProduced, quantidade_total: item.quantidade_total, programacao_id: item.programacao_id });
      toast.success("Progresso atualizado!");
    } catch { toast.error("Erro ao atualizar"); }
  };

  const openEdit = (s: any) => {
    setEditTarget(s);
    setEditForm({
      nome_programacao: s.nome_programacao, tipo: s.tipo, prazo_conclusao: s.prazo_conclusao,
      prioridade: s.prioridade, status: s.status, observacao: s.observacao ?? "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    try {
      await updateProd.mutateAsync({ id: editTarget.id, ...editForm });
      toast.success("Programação atualizada!");
      setEditOpen(false);
    } catch { toast.error("Erro ao atualizar"); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === "production") {
        await deleteProd.mutateAsync({ id: deleteConfirm.id, nome: deleteConfirm.nome });
      } else {
        await deleteItem.mutateAsync({ id: deleteConfirm.id, programacao_id: deleteConfirm.programacao_id!, produto_nome: deleteConfirm.nome });
      }
      toast.success("Excluído com sucesso!");
      setDeleteConfirm(null);
    } catch { toast.error("Erro ao excluir"); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Produções Programadas</h1>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1 h-3 w-3" /> Nova
          </Button>
        </div>

        {(scheduled ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma programação.</p>
        ) : (
          <div className="space-y-3">
            {(scheduled ?? []).map((s) => (
              <Card key={s.id}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm">{s.nome_programacao}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Prazo: {s.prazo_conclusao} | {s.tipo} | {s.prioridade}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className={STATUS_COLORS[s.status] ?? ""}>{s.status}</Badge>
                      {isMaster && (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm({ type: "production", id: s.id, nome: s.nome_programacao })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-0">
                  {s.itens.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded bg-muted/50 p-2 text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{productMap.get(item.produto_id) ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantidade_produzida}/{item.quantidade_total} ({item.quantidade_pendente} pend.)
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number" className="w-20"
                          defaultValue={item.quantidade_produzida}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== item.quantidade_produzida) handleUpdateProgress(item, v);
                          }}
                        />
                        {isMaster && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm({ type: "item", id: item.id, nome: productMap.get(item.produto_id) ?? "item", programacao_id: item.programacao_id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Programação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Nome</Label><Input value={form.nome_programacao} onChange={(e) => setForm((f) => ({ ...f, nome_programacao: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evento">Evento</SelectItem>
                    <SelectItem value="encomenda_interna">Encomenda Interna</SelectItem>
                    <SelectItem value="acao_promocional">Ação Promocional</SelectItem>
                    <SelectItem value="sazonal">Sazonal</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Prioridade</Label>
                <Select value={form.prioridade} onValueChange={(v) => setForm((f) => ({ ...f, prioridade: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Prazo de Conclusão</Label><Input type="date" value={form.prazo_conclusao} onChange={(e) => setForm((f) => ({ ...f, prazo_conclusao: e.target.value }))} /></div>
            <Textarea placeholder="Observação" value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))} />
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Itens</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="mr-1 h-3 w-3" /> Produto</Button>
              </div>
              {form.itens.map((item, idx) => (
                <div key={idx} className="mt-2 flex items-center gap-2">
                  <Select value={item.produto_id} onValueChange={(v) => { const itens = [...form.itens]; itens[idx] = { ...itens[idx], produto_id: v }; setForm((f) => ({ ...f, itens })); }}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{(products ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" className="w-20" value={item.quantidade_total} onChange={(e) => { const itens = [...form.itens]; itens[idx] = { ...itens[idx], quantidade_total: Number(e.target.value) }; setForm((f) => ({ ...f, itens })); }} />
                  <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
            <Button onClick={handleCreate} disabled={createScheduled.isPending} className="w-full">Criar Programação</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog (Master) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Programação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Nome</Label><Input value={editForm.nome_programacao} onChange={(e) => setEditForm((f) => ({ ...f, nome_programacao: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Tipo</Label>
                <Select value={editForm.tipo} onValueChange={(v) => setEditForm((f) => ({ ...f, tipo: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evento">Evento</SelectItem><SelectItem value="encomenda_interna">Encomenda Interna</SelectItem>
                    <SelectItem value="acao_promocional">Ação Promocional</SelectItem><SelectItem value="sazonal">Sazonal</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Prioridade</Label>
                <Select value={editForm.prioridade} onValueChange={(v) => setEditForm((f) => ({ ...f, prioridade: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem><SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Prazo</Label><Input type="date" value={editForm.prazo_conclusao} onChange={(e) => setEditForm((f) => ({ ...f, prazo_conclusao: e.target.value }))} /></div>
              <div><Label className="text-xs">Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planejado">Planejado</SelectItem><SelectItem value="em_producao">Em Produção</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea placeholder="Observação" value={editForm.observacao} onChange={(e) => setEditForm((f) => ({ ...f, observacao: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateProd.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteConfirm?.nome}</strong>?
              {deleteConfirm?.type === "production" && " Todos os itens vinculados também serão excluídos."}
              {" "}Esta ação será registrada no log de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
