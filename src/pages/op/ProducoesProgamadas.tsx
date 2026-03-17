import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useScheduledProductions,
  useOpProducts,
  useCreateScheduled,
  useUpdateScheduledItem,
} from "@/hooks/use-operational";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  planejado: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "em produção": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  concluido: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  atrasado: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cancelado: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

export default function ProducoesProgamadas() {
  const { data: scheduled, isLoading } = useScheduledProductions();
  const { data: products } = useOpProducts();
  const createScheduled = useCreateScheduled();
  const updateItem = useUpdateScheduledItem();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    nome_programacao: "",
    tipo: "evento",
    prazo_conclusao: "",
    prioridade: "media",
    observacao: "",
    itens: [] as { produto_id: string; quantidade_total: number }[],
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const productMap = new Map((products ?? []).map((p) => [p.id, p.nome]));

  const handleCreate = async () => {
    if (!form.nome_programacao || !form.prazo_conclusao) {
      toast.error("Preencha nome e prazo");
      return;
    }
    try {
      await createScheduled.mutateAsync(form);
      toast.success("Programação criada!");
      setShowCreate(false);
      setForm({
        nome_programacao: "",
        tipo: "evento",
        prazo_conclusao: "",
        prioridade: "media",
        observacao: "",
        itens: [],
      });
    } catch {
      toast.error("Erro ao criar");
    }
  };

  const addItem = () => {
    const first = products?.[0];
    if (!first) return;
    setForm((f) => ({
      ...f,
      itens: [...f.itens, { produto_id: first.id, quantidade_total: 1 }],
    }));
  };

  const removeItem = (idx: number) => {
    setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }));
  };

  const handleUpdateProgress = async (item: { id: string; quantidade_produzida: number; quantidade_total: number }, newProduced: number) => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        quantidade_produzida: newProduced,
        quantidade_total: item.quantidade_total,
      });
      toast.success("Progresso atualizado!");
    } catch {
      toast.error("Erro ao atualizar");
    }
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
                    <Badge className={STATUS_COLORS[s.status] ?? ""}>{s.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-0">
                  {s.itens.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded bg-muted/50 p-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{productMap.get(item.produto_id) ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantidade_produzida}/{item.quantidade_total} (
                          {item.quantidade_pendente} pend.)
                        </p>
                      </div>
                      <Input
                        type="number"
                        className="w-20"
                        defaultValue={item.quantidade_produzida}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== item.quantidade_produzida) handleUpdateProgress(item, v);
                        }}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Programação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input
                value={form.nome_programacao}
                onChange={(e) => setForm((f) => ({ ...f, nome_programacao: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evento">Evento</SelectItem>
                    <SelectItem value="encomenda">Encomenda</SelectItem>
                    <SelectItem value="reposicao">Reposição</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Prioridade</Label>
                <Select
                  value={form.prioridade}
                  onValueChange={(v) => setForm((f) => ({ ...f, prioridade: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Prazo de Conclusão</Label>
              <Input
                type="date"
                value={form.prazo_conclusao}
                onChange={(e) => setForm((f) => ({ ...f, prazo_conclusao: e.target.value }))}
              />
            </div>
            <Textarea
              placeholder="Observação"
              value={form.observacao}
              onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
            />

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Itens</Label>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="mr-1 h-3 w-3" /> Produto
                </Button>
              </div>
              {form.itens.map((item, idx) => (
                <div key={idx} className="mt-2 flex items-center gap-2">
                  <Select
                    value={item.produto_id}
                    onValueChange={(v) => {
                      const itens = [...form.itens];
                      itens[idx] = { ...itens[idx], produto_id: v };
                      setForm((f) => ({ ...f, itens }));
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(products ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    className="w-20"
                    value={item.quantidade_total}
                    onChange={(e) => {
                      const itens = [...form.itens];
                      itens[idx] = { ...itens[idx], quantidade_total: Number(e.target.value) };
                      setForm((f) => ({ ...f, itens }));
                    }}
                  />
                  <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={handleCreate} disabled={createScheduled.isPending} className="w-full">
              Criar Programação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
