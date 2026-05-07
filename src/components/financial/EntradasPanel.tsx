import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Pencil, Trash2, Filter } from "lucide-react";
import { format } from "date-fns";
import { formatBRL } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { CLASSIFICACOES_ENTRADA, SUBCATEGORIAS } from "@/lib/dre-constants";
import { EntradaCaixa, useCreateEntrada, useUpdateEntrada, useDeleteEntrada } from "@/hooks/use-fluxo-caixa";

const ORIGENS = [
  "Stone (Débito)", "Vero (Crédito)", "Dinheiro Físico",
  "PIX - Pessoa Física", "PIX - Pessoa Jurídica",
  "Transferência Bancária", "Cheque", "Outro",
];
const STATUS_OPTIONS = ["Confirmada", "Pendente", "Cancelada"];

interface EntradaForm {
  data: string; categoria: string; descricao: string; valor: string;
  observacao: string; status: string;
  classificacao_dre: string; subcategoria_dre: string;
}

const emptyForm = (): EntradaForm => ({
  data: format(new Date(), "yyyy-MM-dd"),
  categoria: "Stone (Débito)", descricao: "", valor: "",
  observacao: "", status: "Confirmada",
  classificacao_dre: "receita_operacional", subcategoria_dre: "",
});

interface Props {
  entradas: EntradaCaixa[];
  loading: boolean;
  externalDialogOpen?: boolean;
  onExternalDialogChange?: (open: boolean) => void;
}

export function EntradasPanel({ entradas, loading, externalDialogOpen, onExternalDialogChange }: Props) {
  const { profile } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = externalDialogOpen ?? internalOpen;
  const setDialogOpen = (v: boolean) => onExternalDialogChange ? onExternalDialogChange(v) : setInternalOpen(v);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EntradaForm>(emptyForm());
  const [origemFilter, setOrigemFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [search, setSearch] = useState("");

  const createMut = useCreateEntrada();
  const updateMut = useUpdateEntrada();
  const deleteMut = useDeleteEntrada();

  const set = (k: keyof EntradaForm, v: string) => setForm((p) => ({ ...p, [k]: v }));

  function openEdit(e: EntradaCaixa) {
    setEditingId(e.id);
    setForm({
      data: e.data,
      categoria: e.categoria,
      descricao: e.descricao,
      valor: e.valor.toString(),
      observacao: e.observacao ?? "",
      status: e.status ?? "Confirmada",
      classificacao_dre: e.classificacao_dre ?? "receita_operacional",
      subcategoria_dre: e.subcategoria_dre ?? "",
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valor = parseFloat(form.valor.replace(",", ".")) || 0;
    if (!form.descricao.trim() || valor <= 0) { toast.error("Preencha descrição e valor."); return; }

    const payload = {
      data: form.data,
      descricao: form.descricao.trim(),
      categoria: form.categoria,
      valor,
      observacao: form.observacao || undefined,
      status: form.status,
      criado_por: profile?.id,
      classificacao_dre: form.classificacao_dre || undefined,
      subcategoria_dre: form.subcategoria_dre || undefined,
    };

    const onSuccess = () => { toast.success(editingId ? "Entrada atualizada!" : "Entrada cadastrada!"); closeDialog(); };
    const onError = (err: Error) => toast.error(err.message);

    if (editingId) updateMut.mutate({ id: editingId, ...payload }, { onSuccess, onError });
    else createMut.mutate(payload, { onSuccess, onError });
  }

  const filtered = useMemo(() => {
    let list = entradas;
    if (origemFilter !== "todas") list = list.filter((e) => e.categoria === origemFilter);
    if (statusFilter !== "todos") list = list.filter((e) => (e.status ?? "Confirmada") === statusFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((e) => e.descricao.toLowerCase().includes(s) || e.categoria.toLowerCase().includes(s));
    }
    return list;
  }, [entradas, origemFilter, statusFilter, search]);

  const submitting = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={origemFilter} onValueChange={setOrigemFilter}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas origens</SelectItem>
            {ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-[200px]" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhuma entrada encontrada.
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.data ? format(new Date(e.data + "T00:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell>{e.categoria}</TableCell>
                  <TableCell className="font-medium">{e.descricao}</TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium">+ {formatBRL(e.valor)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{e.status ?? "Confirmada"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {e.origem === "manual" && (
                        <>
                          <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(e)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Excluir" onClick={() => {
                            if (confirm(`Excluir "${e.descricao}"?`)) deleteMut.mutate(e.id, {
                              onSuccess: () => toast.success("Entrada excluída"),
                              onError: (err: Error) => toast.error(err.message),
                            });
                          }}>
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar Entrada" : "Cadastrar Entrada"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" min="0" value={form.valor} onChange={(e) => set("valor", e.target.value)} placeholder="0,00" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Origem da entrada *</Label>
              <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input value={form.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Ex: Venda do dia" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Classificação DRE *</Label>
                <Select value={form.classificacao_dre} onValueChange={(v) => { set("classificacao_dre", v); set("subcategoria_dre", ""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CLASSIFICACOES_ENTRADA.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Subcategoria DRE *</Label>
                <Select value={form.subcategoria_dre} onValueChange={(v) => set("subcategoria_dre", v)} disabled={!form.classificacao_dre}>
                  <SelectTrigger><SelectValue placeholder={form.classificacao_dre ? "Selecionar" : "Escolha a classificação"} /></SelectTrigger>
                  <SelectContent>{(SUBCATEGORIAS[form.classificacao_dre] ?? []).map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Textarea value={form.observacao} onChange={(e) => set("observacao", e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando…" : editingId ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
