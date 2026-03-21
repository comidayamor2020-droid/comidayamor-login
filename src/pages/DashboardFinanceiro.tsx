import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Wallet, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Clock, Calendar, TrendingUp, TrendingDown, Filter,
} from "lucide-react";
import { format, subDays, differenceInDays, parseISO } from "date-fns";
import { formatBRL } from "@/lib/format";
import { useCaixaDisponivel } from "@/hooks/use-caixa";
import { useEntradas, useSaidas } from "@/hooks/use-fluxo-caixa";

type Periodo = "hoje" | "7dias" | "30dias";

function useContasPendentes() {
  return useQuery({
    queryKey: ["dash-fin-contas-pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_pagar")
        .select("id, descricao, valor, data_vencimento, status, categoria, fornecedor")
        .neq("status", "Pago")
        .order("data_vencimento", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export default function DashboardFinanceiro() {
  const [periodo, setPeriodo] = useState<Periodo>("30dias");

  const hoje = format(new Date(), "yyyy-MM-dd");
  const dateRange = useMemo(() => {
    const to = hoje;
    const from =
      periodo === "hoje" ? hoje
        : periodo === "7dias" ? format(subDays(new Date(), 7), "yyyy-MM-dd")
          : format(subDays(new Date(), 30), "yyyy-MM-dd");
    return { from, to };
  }, [periodo, hoje]);

  const { data: caixa } = useCaixaDisponivel();
  const { data: entradas = [], isLoading: l1 } = useEntradas(dateRange.from, dateRange.to);
  const { data: saidas = [], isLoading: l2 } = useSaidas(dateRange.from, dateRange.to);
  const { data: pendentes = [], isLoading: l3 } = useContasPendentes();

  const loading = l1 || l2 || l3;

  const caixaDisponivel = caixa?.valor ?? 0;
  const totalEntradas = entradas.reduce((s, e) => s + e.valor, 0);
  const totalSaidas = saidas.reduce((s, e) => s + e.valor, 0);
  const saldoFinal = caixaDisponivel + totalEntradas - totalSaidas;

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const in2Days = new Date(todayDate);
  in2Days.setDate(in2Days.getDate() + 2);
  const in7Days = new Date(todayDate);
  in7Days.setDate(in7Days.getDate() + 7);

  const contasVencidas = pendentes.filter((c) => {
    if (!c.data_vencimento) return false;
    return new Date(c.data_vencimento + "T00:00:00") < todayDate;
  });
  const contasVencendo2d = pendentes.filter((c) => {
    if (!c.data_vencimento) return false;
    const d = new Date(c.data_vencimento + "T00:00:00");
    return d >= todayDate && d <= in2Days;
  });
  const compromissos7d = pendentes.filter((c) => {
    if (!c.data_vencimento) return false;
    const d = new Date(c.data_vencimento + "T00:00:00");
    return d >= todayDate && d <= in7Days;
  });

  const totalVencidas = contasVencidas.reduce((s, c) => s + (Number(c.valor) || 0), 0);
  const totalVencendo2d = contasVencendo2d.reduce((s, c) => s + (Number(c.valor) || 0), 0);
  const totalCompromissos7d = compromissos7d.reduce((s, c) => s + (Number(c.valor) || 0), 0);
  const totalCompromissos = totalVencidas + totalCompromissos7d;
  const folgaDeficit = caixaDisponivel - totalCompromissos;

  // Alert level
  let alertLevel: "normal" | "atencao" | "alerta" | "critico" = "normal";
  if (totalCompromissos > 0) {
    const ratio = caixaDisponivel / totalCompromissos;
    if (ratio < 1) alertLevel = "critico";
    else if (ratio < 1.2) alertLevel = "alerta";
    else if (ratio < 1.5) alertLevel = "atencao";
  }
  if (totalVencidas > 0 && caixaDisponivel < totalVencidas) alertLevel = "critico";
  else if (totalVencidas > 0 && alertLevel === "normal") alertLevel = "alerta";

  const alertColor = {
    normal: "border-emerald-300 bg-emerald-500/5",
    atencao: "border-yellow-400 bg-yellow-500/5",
    alerta: "border-orange-400 bg-orange-500/5",
    critico: "border-red-400 bg-red-500/5",
  }[alertLevel];

  const alertLabel = {
    normal: "Situação confortável",
    atencao: "Atenção — folga baixa",
    alerta: "Alerta — risco financeiro",
    critico: "Crítico — déficit projetado",
  }[alertLevel];

  const alertIcon = alertLevel === "normal" ? TrendingUp : AlertTriangle;
  const AlertIcon = alertIcon;

  // Top vencidas for detail
  const topVencidas = contasVencidas.slice(0, 5);
  const topVencendo = contasVencendo2d.slice(0, 5);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard Financeiro</h1>
            <p className="text-sm text-muted-foreground">Visão consolidada de caixa, fluxo e compromissos</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {(["hoje", "7dias", "30dias"] as Periodo[]).map((p) => (
              <Button key={p} size="sm" variant={periodo === p ? "default" : "outline"} onClick={() => setPeriodo(p)}>
                {{ hoje: "Hoje", "7dias": "7 dias", "30dias": "30 dias" }[p]}
              </Button>
            ))}
          </div>
        </div>

        {/* Alert Banner */}
        <div className={`rounded-xl border-2 ${alertColor} p-4 flex items-center gap-3`}>
          <AlertIcon className={`h-5 w-5 shrink-0 ${alertLevel === "normal" ? "text-emerald-600" : alertLevel === "atencao" ? "text-yellow-600" : alertLevel === "alerta" ? "text-orange-600" : "text-red-600"}`} />
          <div>
            <p className={`text-sm font-semibold ${alertLevel === "normal" ? "text-emerald-700" : alertLevel === "atencao" ? "text-yellow-700" : alertLevel === "alerta" ? "text-orange-700" : "text-red-700"}`}>
              {alertLabel}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Caixa: {formatBRL(caixaDisponivel)} | Compromissos: {formatBRL(totalCompromissos)} | {folgaDeficit >= 0 ? "Folga" : "Déficit"}: {formatBRL(Math.abs(folgaDeficit))}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard icon={Wallet} label="Caixa Disponível" value={caixaDisponivel} color="text-foreground" />
              <MetricCard icon={ArrowUpCircle} label="Entradas" value={totalEntradas} color="text-emerald-600" />
              <MetricCard icon={ArrowDownCircle} label="Saídas" value={totalSaidas} color="text-red-600" />
              <MetricCard icon={TrendingUp} label="Saldo Final" value={saldoFinal} color={saldoFinal >= 0 ? "text-emerald-600" : "text-red-600"} />
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard
                icon={AlertTriangle}
                label="Contas Vencidas"
                value={totalVencidas}
                color="text-red-600"
                badge={contasVencidas.length > 0 ? `${contasVencidas.length} contas` : undefined}
                badgeColor="bg-red-500/10 text-red-700 border-red-300"
              />
              <MetricCard
                icon={Clock}
                label="Vencendo em 2 dias"
                value={totalVencendo2d}
                color={totalVencendo2d > 0 ? "text-orange-600" : "text-muted-foreground"}
                badge={contasVencendo2d.length > 0 ? `${contasVencendo2d.length} contas` : undefined}
                badgeColor="bg-orange-500/10 text-orange-700 border-orange-300"
              />
              <MetricCard
                icon={Calendar}
                label="Compromissos 7 dias"
                value={totalCompromissos7d}
                color={totalCompromissos7d > 0 ? "text-yellow-600" : "text-muted-foreground"}
                badge={compromissos7d.length > 0 ? `${compromissos7d.length} contas` : undefined}
                badgeColor="bg-yellow-500/10 text-yellow-700 border-yellow-300"
              />
              <MetricCard
                icon={folgaDeficit >= 0 ? TrendingUp : TrendingDown}
                label={folgaDeficit >= 0 ? "Folga Projetada" : "Déficit Projetado"}
                value={Math.abs(folgaDeficit)}
                color={folgaDeficit >= 0 ? "text-emerald-600" : "text-red-600"}
              />
            </div>

            {/* Detail Tables */}
            {(topVencidas.length > 0 || topVencendo.length > 0) && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {topVencidas.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-card">
                    <div className="px-4 py-3 border-b border-red-200">
                      <p className="text-sm font-semibold text-red-700">⚠ Contas Vencidas</p>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Conta</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topVencidas.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium text-sm">{c.descricao}</TableCell>
                            <TableCell className="text-sm text-red-600">
                              {c.data_vencimento ? format(parseISO(c.data_vencimento), "dd/MM") : "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium text-red-600">
                              {formatBRL(Number(c.valor) || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {topVencendo.length > 0 && (
                  <div className="rounded-lg border border-orange-200 bg-card">
                    <div className="px-4 py-3 border-b border-orange-200">
                      <p className="text-sm font-semibold text-orange-700">⏰ Vencendo em 2 dias</p>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Conta</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topVencendo.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium text-sm">{c.descricao}</TableCell>
                            <TableCell className="text-sm text-orange-600">
                              {c.data_vencimento ? format(parseISO(c.data_vencimento), "dd/MM") : "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium text-orange-600">
                              {formatBRL(Number(c.valor) || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* Caixa update info */}
            {caixa && (
              <div className="text-xs text-muted-foreground text-right">
                Caixa atualizado em {format(new Date(caixa.created_at), "dd/MM/yyyy 'às' HH:mm")}
                {caixa.autor_nome && <> por {caixa.autor_nome}</>}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  badge,
  badgeColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <Card>
      <CardContent className="py-4 px-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        </div>
        <p className={`text-xl font-bold ${color}`}>{formatBRL(value)}</p>
        {badge && (
          <Badge variant="outline" className={`mt-1 text-[10px] ${badgeColor ?? ""}`}>{badge}</Badge>
        )}
      </CardContent>
    </Card>
  );
}
