import { useState, useMemo } from "react";
import { CLASSIFICACOES_SAIDA, SUBCATEGORIAS } from "@/lib/dre-constants";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Filter, Trash2, CheckCircle2 } from "lucide-react";
import { format, differenceInDays, parseISO, addMonths } from "date-fns";
import { formatBRL } from "@/lib/format";

interface ContaPagar {
  id: string;
  descricao: string;
  data_vencimento: string | null;
  valor: number | null;
  status: string | null;
  forma_pagamento: string | null;
  categoria: string | null;
  fornecedor: string | null;
  observacoes: string | null;
  centro_custo: string | null;
  data_pagamento: string | null;
  classificacao_dre: string | null;
  subcategoria_dre: string | null;
}

type FilterPreset = "todas" | "hoje" | "proximos7" | "vencidas" | "agendadas" | "pagas";

const FORMAS_PAGAMENTO = ["Pix", "Boleto", "Cartão de crédito", "Cartão de débito", "Dinheiro", "Transferência", "Outro"];
const STATUS_OPTIONS = ["Falta pagar", "Agendado", "Pago"];
const CATEGORIAS = ["Aluguel", "Energia", "Água", "Internet", "Fornecedores", "Salários", "Impostos", "Marketing", "Manutenção", "Outros"];

function getAlertInfo(c: ContaPagar) {
  if (c.status === "Pago") return { color: "bg-emerald-500/15 text-emerald-700 border-emerald-300", label: "Pago" };
  if (!c.data_vencimento) return { color: "bg-muted text-muted-foreground", label: "—" };
  const dias = differenceInDays(parseISO(c.data_vencimento), new Date());
  if (dias < 0) return { color: "bg-red-500/15 text-red-700 border-red-300", label: "Vencida" };
  if (dias === 0) return { color: "bg-orange-500/15 text-orange-700 border-orange-300", label: "Hoje" };
  if (dias === 1) return { color: "bg-orange-500/15 text-orange-700 border-orange-300", label: "Amanhã" };
  if (dias <= 2) return { color: "bg-yellow-500/15 text-yellow-700 border-yellow-300", label: `${dias}d` };
  return { color: "bg-muted text-muted-foreground", label: `${dias}d` };
}

interface FormState {
  descricao: string; data_vencimento: string; valor: string; status: string;
  forma_pagamento: string; categoria: string; fornecedor: string; observacoes: string;
  centro_custo: string; parcelado: boolean; qtd_parcelas: string; chave_pix: string;
  numero_boleto: string; data_pagamento: string; valor_pago: string; obs_pagamento: string;
  classificacao_dre: string; subcategoria_dre: string;
}

const EMPTY_FORM: FormState = {
  descricao: "", data_vencimento: "", valor: "", status: "Falta pagar",
  forma_pagamento: "", categoria: "", fornecedor: "", observacoes: "",
  centro_custo: "", parcelado: false, qtd_parcelas: "2", chave_pix: "",
  numero_boleto: "", data_pagamento: "", valor_pago: "", obs_pagamento: "",
  classificacao_dre: "", subcategoria_dre: "",
};

export interface SaidasPanelHandle {
  openCreate: () => void;
}

interface Props {
  externalDialogOpen?: boolean;
  onExternalDialogChange?: (open: boolean) => void;
}

export function SaidasPanel({ externalDialogOpen, onExternalDialogChange }: Props) {
  const qc = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = externalDialogOpen ?? internalOpen;
  const setDialogOpen = (v: boolean) => { onExternalDialogChange ? onExternalDialogChange(v) : setInternalOpen(v); };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [filter, setFilter] = useState<FilterPreset>("todas");
  const [catFilter, setCatFilter] = useState<string>("todas");
  const [fpFilter, setFpFilter] = useState<string>("todas");
  const [search, setSearch] = useState("");

  const set = (key: keyof FormState, val: string | boolean) => setForm((p) => ({ ...p, [key]: val }));

  const { data: contas = [], isLoading } = useQuery({
    queryKey: ["contas-pagar"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contas_pagar").select("*").order("data_vencimento", { ascending: true });
      if (error) throw error;
      return data as ContaPagar[];
    },
  });

  function buildObs(): string | null {
    const parts: string[] = [];
    if (form.observacoes) parts.push(form.observacoes);
    if (form.forma_pagamento === "Pix" && form.chave_pix) parts.push(`Chave Pix: ${form.chave_pix}`);
    if (form.forma_pagamento === "Boleto" && form.numero_boleto) parts.push(`Boleto: ${form.numero_boleto}`);
    if (form.status === "Pago" && form.valor_pago) parts.push(`Valor pago: R$ ${form.valor_pago}`);
    if (form.status === "Pago" && form.obs_pagamento) parts.push(`Obs pgto: ${form.obs_pagamento}`);
    return parts.length > 0 ? parts.join(" | ") : null;
  }

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const valorNum = parseFloat(form.valor.replace(",", ".")) || 0;
      if (!form.descricao.trim()) throw new Error("Nome da conta é obrigatório");
      if (!form.data_vencimento) throw new Error("Data de vencimento é obrigatória");
      if (!form.classificacao_dre) throw new Error("Classificação DRE é obrigatória");
      if (!form.subcategoria_dre) throw new Error("Subcategoria DRE é obrigatória");

      const basePayload = {
        descricao: form.descricao.trim(),
        valor: valorNum,
        status: form.status,
        forma_pagamento: form.forma_pagamento || null,
        categoria: form.categoria || null,
        fornecedor: form.fornecedor || null,
        centro_custo: form.centro_custo || null,
        data_pagamento: form.status === "Pago" && form.data_pagamento ? form.data_pagamento : null,
        observacoes: buildObs(),
        classificacao_dre: form.classificacao_dre,
        subcategoria_dre: form.subcategoria_dre,
      };

      if (editingId) {
        const { error } = await supabase.from("contas_pagar").update({ ...basePayload, data_vencimento: form.data_vencimento }).eq("id", editingId);
        if (error) throw error;
      } else if (form.parcelado) {
        const qtd = parseInt(form.qtd_parcelas) || 2;
        const valorParcela = Math.round((valorNum / qtd) * 100) / 100;
        const baseDate = parseISO(form.data_vencimento);
        const rows = Array.from({ length: qtd }, (_, i) => ({
          ...basePayload,
          descricao: `${form.descricao.trim()} (${i + 1}/${qtd})`,
          valor: i === qtd - 1 ? Math.round((valorNum - valorParcela * (qtd - 1)) * 100) / 100 : valorParcela,
          data_vencimento: format(addMonths(baseDate, i), "yyyy-MM-dd"),
        }));
        const { error } = await supabase.from("contas_pagar").insert(rows);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contas_pagar").insert({ ...basePayload, data_vencimento: form.data_vencimento });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas-pagar"] });
      qc.invalidateQueries({ queryKey: ["fluxo-saidas"] });
      toast.success(editingId ? "Conta atualizada!" : "Conta cadastrada!");
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contas_pagar").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas-pagar"] });
      qc.invalidateQueries({ queryKey: ["fluxo-saidas"] });
      toast.success("Conta excluída");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markPaidMutation = useMutation({
    mutationFn: async (c: ContaPagar) => {
      const { error } = await supabase.from("contas_pagar").update({
        status: "Pago",
        data_pagamento: format(new Date(), "yyyy-MM-dd"),
      }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas-pagar"] });
      qc.invalidateQueries({ queryKey: ["fluxo-saidas"] });
      toast.success("Marcado como pago");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function openEdit(c: ContaPagar) {
    setEditingId(c.id);
    setForm({
      ...EMPTY_FORM,
      descricao: c.descricao,
      data_vencimento: c.data_vencimento ?? "",
      valor: c.valor?.toString() ?? "",
      status: c.status ?? "Falta pagar",
      forma_pagamento: c.forma_pagamento ?? "",
      categoria: c.categoria ?? "",
      fornecedor: c.fornecedor ?? "",
      observacoes: c.observacoes ?? "",
      centro_custo: c.centro_custo ?? "",
      data_pagamento: c.data_pagamento ?? "",
      classificacao_dre: c.classificacao_dre ?? "",
      subcategoria_dre: c.subcategoria_dre ?? "",
    });
    setDialogOpen(true);
  }

  const filtered = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    let list = contas;

    if (filter === "hoje") list = list.filter((c) => c.data_vencimento === today);
    else if (filter === "proximos7") list = list.filter((c) => c.data_vencimento && differenceInDays(parseISO(c.data_vencimento), new Date()) >= 0 && differenceInDays(parseISO(c.data_vencimento), new Date()) <= 7);
    else if (filter === "vencidas") list = list.filter((c) => c.data_vencimento && differenceInDays(parseISO(c.data_vencimento), new Date()) < 0 && c.status !== "Pago");
    else if (filter === "agendadas") list = list.filter((c) => c.status === "Agendado");
    else if (filter === "pagas") list = list.filter((c) => c.status === "Pago");

    if (catFilter !== "todas") list = list.filter((c) => c.categoria === catFilter);
    if (fpFilter !== "todas") list = list.filter((c) => c.forma_pagamento === fpFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((c) =>
        c.descricao?.toLowerCase().includes(s) ||
        c.fornecedor?.toLowerCase().includes(s) ||
        c.categoria?.toLowerCase().includes(s)
      );
    }

    return list;
  }, [contas, filter, catFilter, fpFilter, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(["todas", "hoje", "proximos7", "vencidas", "agendadas", "pagas"] as FilterPreset[]).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {{ todas: "Todas", hoje: "Hoje", proximos7: "7 dias", vencidas: "Vencidas", agendadas: "Agendadas", pagas: "Pagas" }[f]}
          </Button>
        ))}
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas cat.</SelectItem>
            {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fpFilter} onValueChange={setFpFilter}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Forma pgto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas formas</SelectItem>
            {FORMAS_PAGAMENTO.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-[200px]"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhuma conta encontrada para este filtro.
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conta</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Forma Pgto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Alerta</TableHead>
                <TableHead className="w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const alert = getAlertInfo(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.descricao}</TableCell>
                    <TableCell>{c.categoria ?? "—"}</TableCell>
                    <TableCell>{c.fornecedor ?? "—"}</TableCell>
                    <TableCell>{c.data_vencimento ? format(parseISO(c.data_vencimento), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell className="text-right text-red-600 font-medium">{c.valor != null ? formatBRL(c.valor) : "—"}</TableCell>
                    <TableCell>{c.forma_pagamento ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{c.status ?? "—"}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${alert.color}`}>{alert.label}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.status !== "Pago" && (
                          <Button size="icon" variant="ghost" title="Marcar como pago" onClick={() => markPaidMutation.mutate(c)}>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Excluir" onClick={() => {
                          if (confirm(`Excluir "${c.descricao}"?`)) deleteMutation.mutate(c.id);
                        }}>
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Conta" : "Cadastrar Saída"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); upsertMutation.mutate(); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome da conta *</Label>
              <Input value={form.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Ex: Aluguel janeiro" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Vencimento *</Label>
                <Input type="date" value={form.data_vencimento} onChange={(e) => set("data_vencimento", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" min="0" value={form.valor} onChange={(e) => set("valor", e.target.value)} placeholder="0,00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fornecedor</Label>
                <Input value={form.fornecedor} onChange={(e) => set("fornecedor", e.target.value)} placeholder="Nome do fornecedor" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Classificação DRE *</Label>
                <Select value={form.classificacao_dre} onValueChange={(v) => { set("classificacao_dre", v); set("subcategoria_dre", ""); }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{CLASSIFICACOES_SAIDA.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
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
              <Label>Forma de pagamento</Label>
              <Select value={form.forma_pagamento} onValueChange={(v) => set("forma_pagamento", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{FORMAS_PAGAMENTO.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.forma_pagamento === "Pix" && (
              <div className="space-y-1.5">
                <Label>Chave Pix</Label>
                <Input value={form.chave_pix} onChange={(e) => set("chave_pix", e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" />
              </div>
            )}
            {form.forma_pagamento === "Boleto" && (
              <div className="space-y-1.5">
                <Label>Número do boleto</Label>
                <Input value={form.numero_boleto} onChange={(e) => set("numero_boleto", e.target.value)} placeholder="Linha digitável" />
              </div>
            )}
            {!editingId && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Switch checked={form.parcelado} onCheckedChange={(v) => set("parcelado", v)} />
                  <Label>Parcelado</Label>
                </div>
                {form.parcelado && (
                  <div className="space-y-1.5">
                    <Label>Quantidade de parcelas</Label>
                    <Input type="number" min="2" max="48" value={form.qtd_parcelas} onChange={(e) => set("qtd_parcelas", e.target.value)} />
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.status === "Pago" && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Data do pagamento</Label>
                    <Input type="date" value={form.data_pagamento} onChange={(e) => set("data_pagamento", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor pago (R$)</Label>
                    <Input type="number" step="0.01" value={form.valor_pago} onChange={(e) => set("valor_pago", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Observação do pagamento</Label>
                  <Input value={form.obs_pagamento} onChange={(e) => set("obs_pagamento", e.target.value)} />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? "Salvando…" : editingId ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
