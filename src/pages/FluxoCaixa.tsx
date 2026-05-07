import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Plus, TrendingUp, Wallet, ArrowUpCircle, ArrowDownCircle, Calendar, CalendarIcon,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { formatBRL } from "@/lib/format";
import { useCaixaDisponivel } from "@/hooks/use-caixa";
import { useEntradas, useSaidas } from "@/hooks/use-fluxo-caixa";
import { useVencimentos } from "@/hooks/use-vencimentos";
import { useFluxoMes } from "@/hooks/use-fluxo-mes";
import { EntradasPanel } from "@/components/financial/EntradasPanel";
import { SaidasPanel } from "@/components/financial/SaidasPanel";
import { AlertTriangle, Pin } from "lucide-react";

type PeriodoFilter = "hoje" | "personalizado";

export default function FluxoCaixa() {
  const { data: venc } = useVencimentos();
  const { data: mes } = useFluxoMes();
  const [periodo, setPeriodo] = useState<PeriodoFilter>("hoje");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<{ from?: Date; to?: Date }>({});
  const [tab, setTab] = useState<string>("resumo");
  const [entradaDialogOpen, setEntradaDialogOpen] = useState(false);
  const [saidaDialogOpen, setSaidaDialogOpen] = useState(false);
  const [saidasInitialFilter, setSaidasInitialFilter] = useState<string | undefined>(undefined);

  const hoje = format(new Date(), "yyyy-MM-dd");
  const dateRange = useMemo(() => {
    if (periodo === "personalizado" && customRange.from && customRange.to) {
      return { from: format(customRange.from, "yyyy-MM-dd"), to: format(customRange.to, "yyyy-MM-dd") };
    }
    return { from: hoje, to: hoje };
  }, [periodo, hoje, customRange]);

  const { data: entradas = [], isLoading: loadingE } = useEntradas(dateRange.from, dateRange.to);
  const { data: saidas = [], isLoading: loadingS } = useSaidas(dateRange.from, dateRange.to);

  const movimentacoes = useMemo(() => {
    const all = [
      ...entradas.map((e) => ({
        id: `e-${e.id}`, data: e.data, tipo: "entrada" as const,
        categoria: e.categoria, descricao: e.descricao, valor: e.valor,
        status: e.status ?? "Confirmada", origem: e.origem,
      })),
      ...saidas.map((s) => ({
        id: `s-${s.id}`, data: s.data, tipo: "saida" as const,
        categoria: s.categoria ?? "—", descricao: s.descricao, valor: s.valor,
        status: "Pago", origem: s.origem,
      })),
    ].sort((a, b) => b.data.localeCompare(a.data));
    return all.slice(0, 50);
  }, [entradas, saidas]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Fluxo de Caixa</h1>
            <p className="text-sm text-muted-foreground">Gerenciamento integrado de entradas, saídas e saldo</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { setTab("entradas"); setEntradaDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> Cadastrar Entrada
            </Button>
            <Button onClick={() => { setTab("saidas"); setSaidaDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> Cadastrar Saída
            </Button>
          </div>
        </div>

        {/* Período */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Período:</span>
          <Select
            value={periodo}
            onValueChange={(v) => {
              if (v === "personalizado") {
                setDraftRange(customRange);
                setCustomDialogOpen(true);
              } else {
                setPeriodo(v as PeriodoFilter);
              }
            }}
          >
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue>
                {periodo === "personalizado" && customRange.from && customRange.to
                  ? `${format(customRange.from, "dd/MM")} - ${format(customRange.to, "dd/MM")}`
                  : { hoje: "Hoje", "7dias": "7 dias", "15dias": "15 dias", "30dias": "30 dias", personalizado: "Personalizado..." }[periodo]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="7dias">7 dias</SelectItem>
              <SelectItem value="15dias">15 dias</SelectItem>
              <SelectItem value="30dias">30 dias</SelectItem>
              <SelectSeparator />
              <SelectItem value="personalizado">
                {customRange.from && customRange.to
                  ? `Personalizado (${format(customRange.from, "dd/MM")} - ${format(customRange.to, "dd/MM")})`
                  : "Personalizado..."}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Selecionar Período Personalizado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !draftRange.from && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {draftRange.from ? format(draftRange.from, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarUI mode="single" selected={draftRange.from} onSelect={(d) => setDraftRange((r) => ({ ...r, from: d }))} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !draftRange.to && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {draftRange.to ? format(draftRange.to, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarUI mode="single" selected={draftRange.to} onSelect={(d) => setDraftRange((r) => ({ ...r, to: d }))} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCustomDialogOpen(false)}>Cancelar</Button>
              <Button
                disabled={!draftRange.from || !draftRange.to}
                onClick={() => {
                  setCustomRange(draftRange);
                  setPeriodo("personalizado");
                  setCustomDialogOpen(false);
                }}
              >
                Aplicar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="entradas">Entradas</TabsTrigger>
            <TabsTrigger value="saidas" className="gap-2">
              Saídas
              {(venc?.total ?? 0) > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">
                  {venc!.total}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* === RESUMO === */}
          <TabsContent value="resumo" className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <SummaryCard icon={Wallet} label="Saldo Inicial (Caixa)" value={saldoInicial} variant="neutral" hint="Saldo de abertura" />
              <SummaryCard icon={ArrowUpCircle} label="Entradas" value={totalEntradas} variant="positive" hint="Receitas do período" />
              <SummaryCard
                icon={ArrowDownCircle}
                label="Saídas"
                value={totalSaidas}
                variant="negative"
                hint="Despesas pagas"
                extra={
                  (venc?.vencidas ?? 0) > 0 || (venc?.vencendoEmBreve ?? 0) > 0 ? (
                    <div className="mt-2 space-y-1">
                      {(venc?.vencidas ?? 0) > 0 && (
                        <button
                          onClick={() => { setSaidasInitialFilter("vencidas"); setTab("saidas"); }}
                          className="flex items-center gap-1 text-[11px] text-red-600 hover:underline"
                        >
                          <AlertTriangle className="h-3 w-3" /> {venc!.vencidas} {venc!.vencidas === 1 ? "conta vencida" : "contas vencidas"}
                        </button>
                      )}
                      {(venc?.vencendoEmBreve ?? 0) > 0 && (
                        <button
                          onClick={() => { setSaidasInitialFilter("proximos7"); setTab("saidas"); }}
                          className="flex items-center gap-1 text-[11px] text-orange-600 hover:underline"
                        >
                          <Pin className="h-3 w-3" /> {venc!.vencendoEmBreve} {venc!.vencendoEmBreve === 1 ? "vencendo em breve" : "vencendo em breve"}
                        </button>
                      )}
                    </div>
                  ) : null
                }
              />
              <SummaryCard icon={TrendingUp} label="Saldo Final" value={saldoFinal} variant={saldoFinal >= 0 ? "positive" : "negative"} hint="Saldo + Ent − Saí" />
              <SummaryCard icon={Calendar} label="Projeção 7 dias" value={projecao7d} variant={projecao7d >= 0 ? "neutral" : "negative"} hint="Baseado em saídas médias" />
            </div>

            {(loadingE || loadingS) ? (
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
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoes.map((m) => (
                      <TableRow key={m.id} className={m.tipo === "entrada" ? "bg-emerald-500/5" : "bg-red-500/5"}>
                        <TableCell>{m.data ? format(new Date(m.data + "T00:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={m.tipo === "entrada"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-300"
                            : "bg-red-500/10 text-red-700 border-red-300"
                          }>
                            {m.tipo === "entrada" ? "Entrada" : "Saída"}
                          </Badge>
                        </TableCell>
                        <TableCell>{m.categoria}</TableCell>
                        <TableCell className="font-medium">{m.descricao}</TableCell>
                        <TableCell className={`text-right font-medium ${m.tipo === "entrada" ? "text-emerald-600" : "text-red-600"}`}>
                          {m.tipo === "entrada" ? "+" : "−"} {formatBRL(m.valor)}
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{m.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* === ENTRADAS === */}
          <TabsContent value="entradas">
            <EntradasPanel
              entradas={entradas}
              loading={loadingE}
              externalDialogOpen={entradaDialogOpen}
              onExternalDialogChange={setEntradaDialogOpen}
            />
          </TabsContent>

          {/* === SAÍDAS === */}
          <TabsContent value="saidas">
            <SaidasPanel
              externalDialogOpen={saidaDialogOpen}
              onExternalDialogChange={setSaidaDialogOpen}
              initialFilter={saidasInitialFilter}
              onInitialFilterApplied={() => setSaidasInitialFilter(undefined)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({
  icon: Icon, label, value, variant, hint, extra,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number;
  variant: "neutral" | "positive" | "negative";
  hint?: string;
  extra?: React.ReactNode;
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
        {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
        {extra}
      </CardContent>
    </Card>
  );
}
