import {
  useOpProducts,
  useTodayLotes,
  useOccurrences,
  useTodayCounts,
  useScheduledProductions,
  getIdealField,
} from "@/hooks/use-operational";
import { buildContextSummary } from "@/lib/council";

export function useCouncilContext() {
  const { data: products, isLoading: l1 } = useOpProducts();
  const { data: lotes, isLoading: l2 } = useTodayLotes();
  const { data: occurrences, isLoading: l3 } = useOccurrences();
  const { data: counts, isLoading: l4 } = useTodayCounts();
  const { data: scheduled, isLoading: l5 } = useScheduledProductions();

  const loading = l1 || l2 || l3 || l4 || l5;

  const todayStr = new Date().toISOString().split("T")[0];
  const idealField = getIdealField();

  const todayProduced = (lotes ?? [])
    .filter((l) => l.status === "concluido")
    .reduce((a, l) => a + Number(l.quantidade), 0);

  const todayOcc = (occurrences ?? []).filter(
    (o) => o.data_solicitacao?.startsWith(todayStr) || o.created_at?.startsWith(todayStr),
  );

  const todayLosses = todayOcc
    .filter((o) => o.tipo_ocorrencia === "perda" && o.status === "aprovado")
    .reduce((a, o) => a + Number(o.quantidade_aprovada ?? 0), 0);

  const todayTastings = todayOcc
    .filter((o) => o.tipo_ocorrencia === "degustacao" && o.status === "aprovado")
    .reduce((a, o) => a + Number(o.quantidade_aprovada ?? 0), 0);

  const divergences = (counts ?? []).filter((c) => c.diferenca !== 0 && c.diferenca !== null).length;

  const pendingApprovals = (occurrences ?? []).filter((o) => o.status === "pendente").length;

  const belowMinimum = (products ?? [])
    .filter((p) => p.config && p.estoque_atual < (p.config.estoque_minimo ?? 0))
    .map((p) => ({
      name: p.nome,
      current: p.estoque_atual,
      minimum: p.config?.estoque_minimo ?? 0,
    }));

  const activeScheduled = (scheduled ?? [])
    .filter((s) => s.status === "planejado" || s.status === "em produção" || s.status === "em_producao")
    .map((s) => ({ name: s.nome_programacao, deadline: s.prazo_conclusao }));

  const contextString = loading
    ? ""
    : buildContextSummary({
        totalProducts: (products ?? []).length,
        belowMinimum,
        todayProduced,
        todayLosses,
        todayTastings,
        divergences,
        pendingApprovals,
        activeScheduled,
      });

  return {
    loading,
    contextString,
    stats: {
      totalProducts: (products ?? []).length,
      todayProduced,
      todayLosses,
      todayTastings,
      divergences,
      pendingApprovals,
      belowMinimum,
      activeScheduled,
    },
  };
}
