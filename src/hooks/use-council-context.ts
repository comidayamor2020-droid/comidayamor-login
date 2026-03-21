import {
  useOpProducts,
  useTodayLotes,
  useOccurrences,
  useTodayCounts,
  useScheduledProductions,
  getIdealField,
  type DayField,
} from "@/hooks/use-operational";

export interface ProductDetail {
  name: string;
  current: number;
  minimum: number;
  ideal: number;
  produced: number;
  gap: number; // ideal - current (positive = under, negative = over)
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
  lossRate: number; // perdas / produzido (%)
  productionEfficiency: number; // % of products meeting ideal
  dataCompleteness: "alta" | "media" | "baixa" | "insuficiente";
}

export function useCouncilContext(): CouncilContextData {
  const { data: products, isLoading: l1 } = useOpProducts();
  const { data: lotes, isLoading: l2 } = useTodayLotes();
  const { data: occurrences, isLoading: l3 } = useOccurrences();
  const { data: counts, isLoading: l4 } = useTodayCounts();
  const { data: scheduled, isLoading: l5 } = useScheduledProductions();

  const loading = l1 || l2 || l3 || l4 || l5;

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
    };
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const idealField = getIdealField();

  // Map product names
  const productNameMap = new Map((products ?? []).map((p) => [p.id, p.nome]));

  // Today's lotes with product names
  const todayLotesList: LoteDetail[] = (lotes ?? []).map((l) => ({
    productName: productNameMap.get(l.produto_id) ?? "Desconhecido",
    quantity: Number(l.quantidade),
    status: l.status,
    observation: l.observacao,
  }));

  const completedLotes = todayLotesList.filter((l) => l.status === "concluido");
  const todayProduced = completedLotes.reduce((a, l) => a + l.quantity, 0);

  // Production per product
  const prodByProduct = new Map<string, number>();
  for (const l of lotes ?? []) {
    if (l.status === "concluido") {
      const cur = prodByProduct.get(l.produto_id) ?? 0;
      prodByProduct.set(l.produto_id, cur + Number(l.quantidade));
    }
  }

  // Today occurrences
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

  // Divergences with detail
  const divergences: DivergenceDetail[] = (counts ?? [])
    .filter((c) => c.diferenca !== 0 && c.diferenca !== null)
    .map((c) => ({
      productName: productNameMap.get(c.produto_id) ?? "Desconhecido",
      expected: Number(c.estoque_esperado),
      counted: Number(c.estoque_contado),
      diff: Number(c.diferenca),
    }))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  // Product analysis: below minimum, over/under produced
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
  overProduced.sort((a, b) => a.gap - b.gap); // most over first (most negative)
  underProduced.sort((a, b) => b.gap - a.gap); // most under first (most positive)

  const totalWithIdeal = (products ?? []).filter(
    (p) => p.config && Number((p.config as Record<string, unknown>)[idealField] ?? 0) > 0,
  ).length;

  const productionEfficiency = totalWithIdeal > 0
    ? Math.round((meetingIdeal / totalWithIdeal) * 100)
    : 0;

  const lossRate = todayProduced > 0
    ? Math.round((todayLosses / todayProduced) * 100 * 10) / 10
    : 0;

  // Scheduled productions
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

  // Data completeness assessment
  const hasProducts = (products ?? []).length > 0;
  const hasLotes = (lotes ?? []).length > 0;
  const hasCounts = (counts ?? []).length > 0;
  const hasConfigs = (products ?? []).some((p) => p.config);
  const signals = [hasProducts, hasLotes, hasCounts, hasConfigs].filter(Boolean).length;
  const dataCompleteness: CouncilContextData["dataCompleteness"] =
    signals >= 4 ? "alta" : signals >= 3 ? "media" : signals >= 2 ? "baixa" : "insuficiente";

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
    todayLotes,
    pendingOccurrences,
    lossRate,
    productionEfficiency,
    dataCompleteness,
  };
}
