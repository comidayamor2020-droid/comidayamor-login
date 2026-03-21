import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CLASSIFICACOES_ENTRADA, SUBCATEGORIAS } from "@/lib/dre-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plus, TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle, Filter, Calendar,
} from "lucide-react";
import { format, subDays, addDays } from "date-fns";
import { formatBRL } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { useCaixaDisponivel } from "@/hooks/use-caixa";
import { useEntradas, useSaidas, useCreateEntrada } from "@/hooks/use-fluxo-caixa";

const CATEGORIAS_ENTRADA = ["vendas", "aporte", "recebimento", "reembolso", "outros"];
type PeriodoFilter = "hoje" | "7dias" | "30dias";

interface EntradaForm {
  data: string;
  descricao: string;
  categoria: string;
  valor: string;
  observacao: string;
  classificacao_dre: string;
  subcategoria_dre: string;
}

const EMPTY_FORM: EntradaForm = {
  data: format(new Date(), "yyyy-MM-dd"),
  descricao: "",
  categoria: "vendas",
  valor: "",
  observacao: "",
  classificacao_dre: "receita_operacional",
  subcategoria_dre: "",
};

export default function FluxoCaixa() {
  const { profile } = useAuth();
  const { data: caixa } = useCaixaDisponivel();

  const [periodo, setPeriodo] = useState<PeriodoFilter>("30dias");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [catFilter, setCatFilter] = useState<string>("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<EntradaForm>(EMPTY_FORM);

  const hoje = format(new Date(), "yyyy-MM-dd");
  const dateRange = useMemo(() => {
    const to = hoje;
    const from =
      periodo === "hoje" ? hoje
      : periodo === "7dias" ? format(subDays(new Date(), 7), "yyyy-MM-dd")
      : format(subDays(new Date(), 30), "yyyy-MM-dd");
    return { from, to };
  }, [periodo, hoje]);

  const { data: entradas = [], isLoading: loadingE } = useEntradas(dateRange.from, dateRange.to);
  const { data: saidas = [], isLoading: loadingS } = useSaidas(dateRange.from, dateRange.to);
  const createEntrada = useCreateEntrada();

  // Unified movements list
  const movimentacoes = useMemo(() => {
    const all = [
      ...entradas.map((e) => ({
        id: e.id,
        data: e.data,
        tipo: "entrada" as const,
        categoria: e.categoria,
        descricao: e.descricao,
        valor: e.valor,
        origem: e.origem,
      })),
      ...saidas.map((s) => ({
        id: s.id,
        data: s.data,
        tipo: "saida" as const,
        categoria: s.categoria ?? "—",
        descricao: s.descricao,
        valor: s.valor,
        origem: s.origem,
      })),
    ].sort((a, b) => b.data.localeCompare(a.data));

    let filtered = all;
    if (tipoFilter !== "todos") filtered = filtered.filter((m) => m.tipo === tipoFilter);
    if (catFilter !== "todas") filtered = filtered.filter((m) => m.categoria === catFilter);
    return filtered;
  }, [entradas, saidas, tipoFilter, catFilter]);

  // Summary
  const totalEntradas = entradas.reduce((s, e) => s + e.valor, 0);
  const totalSaidas = saidas.reduce((s, e) => s + e.valor, 0);
  const saldoInicial = caixa?.valor ?? 0;
  const saldoFinal = saldoInicial + totalEntradas - totalSaidas;

  // Projeção 7 dias: média diária de saídas * 7
  const diasPeriodo = periodo === "hoje" ? 1 : periodo === "7dias" ? 7 : 30;
  const mediaDiariaSaidas = diasPeriodo > 0 ? totalSaidas / diasPeriodo : 0;
  const projecao7d = saldoInicial - mediaDiariaSaidas * 7;

  const loading = loadingE || loadingS;

  const set = (key: keyof EntradaForm, val: string) => setForm((p) => ({ ...p, [key]: val }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valor = parseFloat(form.valor.replace(",", ".")) || 0;
    if (!form.descricao.trim() || valor <= 0) {
      toast.error("Preencha descrição e valor.");
      return;
    }
    if (!form.classificacao_dre || !form.subcategoria_dre) {
      toast.error("Preencha classificação e subcategoria DRE.");
      return;
    }
    createEntrada.mutate(
      {
        data: form.data,
        descricao: form.descricao.trim(),
        categoria: form.categoria,
        valor,
        observacao: form.observacao || undefined,
        criado_por: profile?.id,
      },
      {
        onSuccess: () => {
          toast.success("Entrada cadastrada!");
          setDialogOpen(false);
          setForm(EMPTY_FORM);
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  }

  // Collect all categories for filter
  const allCats = useMemo(() => {
    const cats = new Set<string>();
    entradas.forEach((e) => cats.add(e.categoria));
    saidas.forEach((s) => { if (s.categoria) cats.add(s.categoria); });
    return Array.from(cats).sort();
  }, [entradas, saidas]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Fluxo de Caixa</h1>
            <p className="text-sm text-muted-foreground">Visão gerencial de entradas, saídas e saldo</p>
          </div>
          <Button onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Cadastrar Entrada
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <SummaryCard icon={Wallet} label="Saldo Inicial (Caixa)" value={saldoInicial} variant="neutral" />
          <SummaryCard icon={ArrowUpCircle} label="Entradas" value={totalEntradas} variant="positive" />
          <SummaryCard icon={ArrowDownCircle} label="Saídas" value={totalSaidas} variant="negative" />
          <SummaryCard icon={TrendingUp} label="Saldo Final" value={saldoFinal} variant={saldoFinal >= 0 ? "positive" : "negative"} />
          <SummaryCard icon={Calendar} label="Projeção 7 dias" value={projecao7d} variant={projecao7d >= 0 ? "neutral" : "negative"} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(["hoje", "7dias", "30dias"] as PeriodoFilter[]).map((p) => (
            <Button key={p} size="sm" variant={periodo === p ? "default" : "outline"} onClick={() => setPeriodo(p)}>
              {{ hoje: "Hoje", "7dias": "7 dias", "30dias": "30 dias" }[p]}
            </Button>
          ))}
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="entrada">Entradas</SelectItem>
              <SelectItem value="saida">Saídas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas cat.</SelectItem>
              {allCats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
          </div>
        ) : movimentacoes.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma movimentação encontrada para este período.
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimentacoes.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.data ? format(new Date(m.data + "T00:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={m.tipo === "entrada"
                          ? "bg-emerald-500/10 text-emerald-700 border-emerald-300"
                          : "bg-red-500/10 text-red-700 border-red-300"
                        }
                      >
                        {m.tipo === "entrada" ? "Entrada" : "Saída"}
                      </Badge>
                    </TableCell>
                    <TableCell>{m.categoria}</TableCell>
                    <TableCell className="font-medium">{m.descricao}</TableCell>
                    <TableCell className={`text-right font-medium ${m.tipo === "entrada" ? "text-emerald-600" : "text-red-600"}`}>
                      {m.tipo === "entrada" ? "+" : "−"} {formatBRL(m.valor)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.origem}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dialog: Nova Entrada */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Entrada</DialogTitle>
          </DialogHeader>
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
              <Label>Descrição *</Label>
              <Input value={form.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Ex: Venda do dia" required />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_ENTRADA.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Textarea value={form.observacao} onChange={(e) => set("observacao", e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createEntrada.isPending}>
                {createEntrada.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

/* ---- Summary Card ---- */

function SummaryCard({
  icon: Icon,
  label,
  value,
  variant,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  variant: "neutral" | "positive" | "negative";
}) {
  const color =
    variant === "positive" ? "text-emerald-600" : variant === "negative" ? "text-red-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="py-4 px-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        </div>
        <p className={`text-xl font-bold ${color}`}>{formatBRL(value)}</p>
      </CardContent>
    </Card>
  );
}
