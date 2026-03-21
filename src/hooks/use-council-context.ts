import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCaixaDisponivel } from "@/hooks/use-caixa";
import {
  useOpProducts,
  useTodayLotes,
  useOccurrences,
  useTodayCounts,
  useScheduledProductions,
  getIdealField,
} from "@/hooks/use-operational";

export interface ProductDetail {
  name: string;
  current: number;
  minimum: number;
  ideal: number;
  produced: number;
  gap: number;
}

export interface DivergenceDetail {
  productName: string;
  expected: number;
  counted: number;
  diff: number;
}

export interface OccurrenceDetail {
  productName: string;
  type: string;
  quantity: number;
  status: string;
  reason: string;
}

export interface ScheduledDetail {
  name: string;
  deadline: string;
  status: string;
  priority: string;
  totalItems: number;
  completedItems: number;
}

export interface LoteDetail {
  productName: string;
  quantity: number;
  status: string;
  observation: string | null;
}

// ─── Cash Flow Types ────────────────────────────

export interface ContaPagar {
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: string;
  categoria: string | null;
  fornecedor: string | null;
  forma_pagamento: string | null;
}

export interface FluxoResumo {
  entradasPeriodo: number;
  saidasPeriodo: number;
  saldoFinal: number;
  mediaDiariaSaidas: number;
  projecao7d: number;
}

export interface CashFlowAnalysis {
  /** Estimated available cash (received - paid) */
  caixaDisponivel: number;
  /** Overdue unpaid bills */
  contasVencidas: ContaPagar[];
  totalVencidas: number;
  /** Due in next 2 days */
  contasProx2Dias: ContaPagar[];
  totalProx2Dias: number;
  /** Due in next 7 days */
  contasProx7Dias: ContaPagar[];
  totalProx7Dias: number;
  /** Total upcoming commitments (overdue + 7 days) */
  totalCompromissos: number;
  /** Cash minus commitments */
  folgaOuDeficit: number;
  /** Alert level */
  alertLevel: "normal" | "atencao" | "alerta" | "critico";
}

export interface CouncilContextData {
  loading: boolean;
  totalProducts: number;
  todayProduced: number;
  todayLosses: number;
  todayTastings: number;
  pendingApprovals: number;
  belowMinimum: ProductDetail[];
  overProduced: ProductDetail[];
  underProduced: ProductDetail[];
  divergences: DivergenceDetail[];
  todayOccurrences: OccurrenceDetail[];
  activeScheduled: ScheduledDetail[];
  todayLotes: LoteDetail[];
  pendingOccurrences: OccurrenceDetail[];
  lossRate: number;
  productionEfficiency: number;
  dataCompleteness: "alta" | "media" | "baixa" | "insuficiente";
  cashFlow: CashFlowAnalysis;
}

// ─── Supabase queries for financial data ────────

function useContasPagar() {
  return useQuery({
    queryKey: ["council-contas-pagar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_pagar")
        .select("descricao, valor, data_vencimento, status, categoria, fornecedor, forma_pagamento")
        .order("data_vencimento", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

function useContasReceber() {
  return useQuery({
    queryKey: ["council-contas-receber"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_receber")
        .select("valor, status");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

function useContasPagas() {
  return useQuery({
    queryKey: ["council-contas-pagas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_pagar")
        .select("valor")
        .eq("status", "pago");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

function computeCashFlow(
  contasPagar: { descricao: string; valor: number | null; data_vencimento: string | null; status: string | null; categoria: string | null; fornecedor: string | null; forma_pagamento: string | null }[],
  contasReceber: { valor: number | null; status: string | null }[],
  contasPagas: { valor: number | null }[],
  caixaManualValor: number | null,
): CashFlowAnalysis {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const in2Days = new Date(today);
  in2Days.setDate(in2Days.getDate() + 2);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  // Use manual cash balance if available, otherwise estimate from receivables - payables
  let caixaDisponivel: number;
  if (caixaManualValor !== null && caixaManualValor !== undefined) {
    caixaDisponivel = caixaManualValor;
  } else {
    const totalRecebido = contasReceber
      .filter((c) => c.status === "recebido" || c.status === "pago")
      .reduce((sum, c) => sum + (Number(c.valor) || 0), 0);
    const totalPago = contasPagas.reduce((sum, c) => sum + (Number(c.valor) || 0), 0);
    caixaDisponivel = totalRecebido - totalPago;
  }

  // Unpaid bills
  const unpaid = contasPagar.filter(
    (c) => c.status !== "pago" && c.data_vencimento && c.valor,
  );

  const toContaPagar = (c: typeof unpaid[0]): ContaPagar => ({
    descricao: c.descricao,
    valor: Number(c.valor) || 0,
    data_vencimento: c.data_vencimento!,
    status: c.status || "falta_pagar",
    categoria: c.categoria,
    fornecedor: c.fornecedor,
    forma_pagamento: c.forma_pagamento,
  });

  const contasVencidas: ContaPagar[] = [];
  const contasProx2Dias: ContaPagar[] = [];
  const contasProx7Dias: ContaPagar[] = [];

  for (const c of unpaid) {
    const venc = new Date(c.data_vencimento + "T00:00:00");
    const cp = toContaPagar(c);
    if (venc < today) {
      contasVencidas.push(cp);
    } else if (venc <= in2Days) {
      contasProx2Dias.push(cp);
    } else if (venc <= in7Days) {
      contasProx7Dias.push(cp);
    }
  }

  const totalVencidas = contasVencidas.reduce((s, c) => s + c.valor, 0);
  const totalProx2Dias = contasProx2Dias.reduce((s, c) => s + c.valor, 0);
  const totalProx7Dias = contasProx7Dias.reduce((s, c) => s + c.valor, 0);
  const totalCompromissos = totalVencidas + totalProx2Dias + totalProx7Dias;
  const folgaOuDeficit = caixaDisponivel - totalCompromissos;

  // Alert level
  let alertLevel: CashFlowAnalysis["alertLevel"] = "normal";
  if (totalCompromissos > 0) {
    const ratio = caixaDisponivel / totalCompromissos;
    if (ratio < 1) alertLevel = "critico";
    else if (ratio < 1.2) alertLevel = "alerta";
    else if (ratio < 1.5) alertLevel = "atencao";
  }
  // Overdue alone is critical
  if (totalVencidas > 0 && caixaDisponivel < totalVencidas) {
    alertLevel = "critico";
  } else if (totalVencidas > 0 && alertLevel === "normal") {
    alertLevel = "alerta";
  }

  return {
    caixaDisponivel,
    contasVencidas,
    totalVencidas,
    contasProx2Dias,
    totalProx2Dias,
    contasProx7Dias,
    totalProx7Dias,
    totalCompromissos,
    folgaOuDeficit,
    alertLevel,
  };
}

const EMPTY_CASH_FLOW: CashFlowAnalysis = {
  caixaDisponivel: 0,
  contasVencidas: [],
  totalVencidas: 0,
  contasProx2Dias: [],
  totalProx2Dias: 0,
  contasProx7Dias: [],
  totalProx7Dias: 0,
  totalCompromissos: 0,
  folgaOuDeficit: 0,
  alertLevel: "normal",
};

export function useCouncilContext(): CouncilContextData {
  const { data: products, isLoading: l1 } = useOpProducts();
  const { data: lotes, isLoading: l2 } = useTodayLotes();
  const { data: occurrences, isLoading: l3 } = useOccurrences();
  const { data: counts, isLoading: l4 } = useTodayCounts();
  const { data: scheduled, isLoading: l5 } = useScheduledProductions();
  const { data: contasPagar, isLoading: l6 } = useContasPagar();
  const { data: contasReceber, isLoading: l7 } = useContasReceber();
  const { data: contasPagas, isLoading: l8 } = useContasPagas();
  const { data: caixaManual, isLoading: l9 } = useCaixaDisponivel();

  const loading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l9;

  if (loading) {
    return {
      loading: true,
      totalProducts: 0,
      todayProduced: 0,
      todayLosses: 0,
      todayTastings: 0,
      pendingApprovals: 0,
      belowMinimum: [],
      overProduced: [],
      underProduced: [],
      divergences: [],
      todayOccurrences: [],
      activeScheduled: [],
      todayLotes: [],
      pendingOccurrences: [],
      lossRate: 0,
      productionEfficiency: 0,
      dataCompleteness: "insuficiente",
      cashFlow: EMPTY_CASH_FLOW,
    };
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const idealField = getIdealField();
  const productNameMap = new Map((products ?? []).map((p) => [p.id, p.nome]));

  const todayLotesList: LoteDetail[] = (lotes ?? []).map((l) => ({
    productName: productNameMap.get(l.produto_id) ?? "Desconhecido",
    quantity: Number(l.quantidade),
    status: l.status,
    observation: l.observacao,
  }));

  const completedLotes = todayLotesList.filter((l) => l.status === "concluido");
  const todayProduced = completedLotes.reduce((a, l) => a + l.quantity, 0);

  const prodByProduct = new Map<string, number>();
  for (const l of lotes ?? []) {
    if (l.status === "concluido") {
      const cur = prodByProduct.get(l.produto_id) ?? 0;
      prodByProduct.set(l.produto_id, cur + Number(l.quantidade));
    }
  }

  const todayOcc = (occurrences ?? []).filter(
    (o) => o.data_solicitacao?.startsWith(todayStr) || o.created_at?.startsWith(todayStr),
  );

  const todayLosses = todayOcc
    .filter((o) => o.tipo_ocorrencia === "perda" && o.status === "aprovado")
    .reduce((a, o) => a + Number(o.quantidade_aprovada ?? 0), 0);

  const todayTastings = todayOcc
    .filter((o) => o.tipo_ocorrencia === "degustacao" && o.status === "aprovado")
    .reduce((a, o) => a + Number(o.quantidade_aprovada ?? 0), 0);

  const todayOccurrences: OccurrenceDetail[] = todayOcc.map((o) => ({
    productName: productNameMap.get(o.produto_id) ?? "Desconhecido",
    type: o.tipo_ocorrencia,
    quantity: Number(o.quantidade_solicitada),
    status: o.status,
    reason: o.motivo,
  }));

  const pendingOccurrences: OccurrenceDetail[] = (occurrences ?? [])
    .filter((o) => o.status === "pendente")
    .map((o) => ({
      productName: productNameMap.get(o.produto_id) ?? "Desconhecido",
      type: o.tipo_ocorrencia,
      quantity: Number(o.quantidade_solicitada),
      status: o.status,
      reason: o.motivo,
    }));

  const pendingApprovals = pendingOccurrences.length;

  const divergences: DivergenceDetail[] = (counts ?? [])
    .filter((c) => c.diferenca !== 0 && c.diferenca !== null)
    .map((c) => ({
      productName: productNameMap.get(c.produto_id) ?? "Desconhecido",
      expected: Number(c.estoque_esperado),
      counted: Number(c.estoque_contado),
      diff: Number(c.diferenca),
    }))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  const belowMinimum: ProductDetail[] = [];
  const overProduced: ProductDetail[] = [];
  const underProduced: ProductDetail[] = [];
  let meetingIdeal = 0;

  for (const p of products ?? []) {
    if (!p.config) continue;
    const ideal = Number((p.config as Record<string, unknown>)[idealField] ?? 0);
    const current = p.estoque_atual;
    const minimum = p.config.estoque_minimo ?? 0;
    const produced = prodByProduct.get(p.id) ?? 0;
    const gap = ideal - current;
    const detail: ProductDetail = { name: p.nome, current, minimum, ideal, produced, gap };

    if (current < minimum) belowMinimum.push(detail);
    if (current > ideal && ideal > 0) overProduced.push(detail);
    if (current < ideal && ideal > 0) underProduced.push(detail);
    if (ideal > 0 && current >= ideal) meetingIdeal++;
  }

  belowMinimum.sort((a, b) => (a.current / Math.max(a.minimum, 1)) - (b.current / Math.max(b.minimum, 1)));
  overProduced.sort((a, b) => a.gap - b.gap);
  underProduced.sort((a, b) => b.gap - a.gap);

  const totalWithIdeal = (products ?? []).filter(
    (p) => p.config && Number((p.config as Record<string, unknown>)[idealField] ?? 0) > 0,
  ).length;

  const productionEfficiency = totalWithIdeal > 0
    ? Math.round((meetingIdeal / totalWithIdeal) * 100)
    : 0;

  const lossRate = todayProduced > 0
    ? Math.round((todayLosses / todayProduced) * 100 * 10) / 10
    : 0;

  const activeScheduled: ScheduledDetail[] = (scheduled ?? [])
    .filter((s) => s.status !== "concluido" && s.status !== "cancelado")
    .map((s) => ({
      name: s.nome_programacao,
      deadline: s.prazo_conclusao,
      status: s.status,
      priority: s.prioridade,
      totalItems: (s as { itens?: unknown[] }).itens?.length ?? 0,
      completedItems: ((s as { itens?: { status: string }[] }).itens ?? []).filter(
        (i) => i.status === "concluido",
      ).length,
    }));

  const hasProducts = (products ?? []).length > 0;
  const hasLotes = (lotes ?? []).length > 0;
  const hasCounts = (counts ?? []).length > 0;
  const hasConfigs = (products ?? []).some((p) => p.config);
  const signals = [hasProducts, hasLotes, hasCounts, hasConfigs].filter(Boolean).length;
  const dataCompleteness: CouncilContextData["dataCompleteness"] =
    signals >= 4 ? "alta" : signals >= 3 ? "media" : signals >= 2 ? "baixa" : "insuficiente";

  // Cash flow analysis
  const cashFlow = computeCashFlow(contasPagar ?? [], contasReceber ?? [], contasPagas ?? [], caixaManual?.valor ?? null);

  return {
    loading: false,
    totalProducts: (products ?? []).length,
    todayProduced,
    todayLosses,
    todayTastings,
    pendingApprovals,
    belowMinimum,
    overProduced,
    underProduced,
    divergences,
    todayOccurrences,
    activeScheduled,
    todayLotes: todayLotesList,
    pendingOccurrences,
    lossRate,
    productionEfficiency,
    dataCompleteness,
    cashFlow,
  };
}
