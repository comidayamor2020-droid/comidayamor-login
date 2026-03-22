import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/audit";

const today = () => new Date().toISOString().split("T")[0];

const DAY_FIELDS = [
  "estoque_ideal_dom", "estoque_ideal_seg", "estoque_ideal_ter",
  "estoque_ideal_qua", "estoque_ideal_qui", "estoque_ideal_sex", "estoque_ideal_sab",
] as const;

export type DayField = (typeof DAY_FIELDS)[number];

export function getIdealField(date?: Date): DayField {
  return DAY_FIELDS[(date ?? new Date()).getDay()];
}

/* ──────── queries ──────── */

export function useOpProducts() {
  return useQuery({
    queryKey: ["op-products"],
    queryFn: async () => {
      const [r1, r2, r3] = await Promise.all([
        supabase.from("produtos").select("id, nome, categoria, ativo").eq("ativo", true).order("nome"),
        supabase.from("op_config_produtos").select("*"),
        supabase.from("op_estoque_produtos").select("*"),
      ]);
      const configMap = new Map((r2.data ?? []).map((c) => [c.produto_id, c]));
      const estoqueMap = new Map((r3.data ?? []).map((e) => [e.produto_id, e]));
      return (r1.data ?? []).map((p) => ({
        ...p,
        config: configMap.get(p.id) ?? null,
        estoque_atual: estoqueMap.get(p.id)?.estoque_atual ?? 0,
      }));
    },
  });
}

export function useTodayLotes() {
  const d = today();
  return useQuery({
    queryKey: ["op-lotes-today", d],
    queryFn: async () => {
      const { data } = await supabase
        .from("op_lotes_producao")
        .select("*")
        .eq("data_producao", d)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function useTodayCounts() {
  const d = today();
  return useQuery({
    queryKey: ["op-counts-today", d],
    queryFn: async () => {
      const { data } = await supabase
        .from("op_contagens_loja")
        .select("*")
        .eq("data_contagem", d);
      return data ?? [];
    },
  });
}

export function useOccurrences(status?: string) {
  return useQuery({
    queryKey: ["op-occurrences", status],
    queryFn: async () => {
      let q = supabase
        .from("op_solicitacoes_ocorrencia")
        .select("*")
        .order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data } = await q;
      return data ?? [];
    },
  });
}

export function useScheduledProductions() {
  return useQuery({
    queryKey: ["op-scheduled"],
    queryFn: async () => {
      const [r1, r2] = await Promise.all([
        supabase.from("op_producoes_programadas").select("*").order("prazo_conclusao"),
        supabase.from("op_producoes_programadas_itens").select("*"),
      ]);
      if (r1.error) console.error("Erro ao carregar programações:", r1.error);
      if (r2.error) console.error("Erro ao carregar itens programados:", r2.error);
      const itensMap = new Map<string, NonNullable<typeof r2.data>>();
      for (const item of r2.data ?? []) {
        const list = itensMap.get(item.programacao_id) ?? [];
        list.push(item);
        itensMap.set(item.programacao_id, list);
      }
      return (r1.data ?? []).map((p) => ({ ...p, itens: itensMap.get(p.id) ?? [] }));
    },
  });
}

/* ──────── mutations ──────── */

async function updateStock(produto_id: string, delta: number) {
  const { data: existing } = await supabase
    .from("op_estoque_produtos")
    .select("estoque_atual")
    .eq("produto_id", produto_id)
    .maybeSingle();
  const newStock = Math.max(0, (existing?.estoque_atual ?? 0) + delta);
  await supabase
    .from("op_estoque_produtos")
    .upsert(
      { produto_id, estoque_atual: newStock, updated_at: new Date().toISOString() },
      { onConflict: "produto_id" },
    );
}

export function useRegisterLote() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      produto_id: string;
      quantidade: number;
      observacao?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from("op_lotes_producao")
        .insert({
          produto_id: input.produto_id,
          quantidade: input.quantidade,
          observacao: input.observacao ?? null,
          status: input.status ?? "pendente",
          criado_por: profile?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      if (input.status === "concluido") await updateStock(input.produto_id, input.quantidade);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["op-lotes-today"] });
      qc.invalidateQueries({ queryKey: ["op-products"] });
    },
  });
}

export function useCompleteLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; produto_id: string; quantidade: number }) => {
      const { error } = await supabase
        .from("op_lotes_producao")
        .update({ status: "concluido", concluido_em: new Date().toISOString() })
        .eq("id", input.id);
      if (error) throw error;
      await updateStock(input.produto_id, input.quantidade);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["op-lotes-today"] });
      qc.invalidateQueries({ queryKey: ["op-products"] });
    },
  });
}

export function useSubmitCount() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      produto_id: string;
      estoque_esperado: number;
      estoque_contado: number;
      observacao?: string;
    }) => {
      const { error } = await supabase.from("op_contagens_loja").insert({
        produto_id: input.produto_id,
        estoque_esperado: input.estoque_esperado,
        estoque_contado: input.estoque_contado,
        observacao: input.observacao ?? null,
        criado_por: profile?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["op-counts-today"] });
    },
  });
}

export function useRequestOccurrence() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      produto_id: string;
      tipo_ocorrencia: string;
      quantidade_solicitada: number;
      motivo: string;
      observacao?: string;
    }) => {
      const { error } = await supabase.from("op_solicitacoes_ocorrencia").insert({
        produto_id: input.produto_id,
        tipo_ocorrencia: input.tipo_ocorrencia,
        quantidade_solicitada: input.quantidade_solicitada,
        motivo: input.motivo,
        observacao: input.observacao ?? null,
        solicitado_por: profile?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["op-occurrences"] });
    },
  });
}

export function useApproveOccurrence() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      produto_id: string;
      status: "aprovado" | "reprovado";
      quantidade_aprovada?: number;
    }) => {
      const update: Record<string, unknown> = {
        status: input.status,
        aprovado_por: profile?.id ?? null,
        aprovado_em: new Date().toISOString(),
      };
      if (input.status === "aprovado" && input.quantidade_aprovada != null) {
        update.quantidade_aprovada = input.quantidade_aprovada;
      }
      const { error } = await supabase
        .from("op_solicitacoes_ocorrencia")
        .update(update)
        .eq("id", input.id);
      if (error) throw error;
      if (input.status === "aprovado" && input.quantidade_aprovada) {
        await updateStock(input.produto_id, -input.quantidade_aprovada);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["op-occurrences"] });
      qc.invalidateQueries({ queryKey: ["op-products"] });
    },
  });
}

export function useUpdateProductConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { produto_id: string; config: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("op_config_produtos")
        .upsert(
          { produto_id: input.produto_id, ...input.config, updated_at: new Date().toISOString() } as never,
          { onConflict: "produto_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["op-products"] });
    },
  });
}

export function useCreateScheduled() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      nome_programacao: string;
      tipo: string;
      prazo_conclusao: string;
      prioridade: string;
      observacao?: string;
      itens: { produto_id: string; quantidade_total: number }[];
    }) => {
      // Step 1: insert header
      const { data: prog, error: e1 } = await supabase
        .from("op_producoes_programadas")
        .insert({
          nome_programacao: input.nome_programacao,
          tipo: input.tipo,
          prazo_conclusao: input.prazo_conclusao,
          prioridade: input.prioridade,
          observacao: input.observacao ?? null,
          criado_por: profile?.id ?? null,
        })
        .select()
        .single();
      if (e1) {
        console.error("Erro ao criar cabeçalho da programação:", e1);
        throw new Error(e1.message);
      }
      // Step 2: insert items (WITHOUT quantidade_pendente - it's generated)
      if (input.itens.length > 0) {
        const { error: e2 } = await supabase
          .from("op_producoes_programadas_itens")
          .insert(
            input.itens.map((i) => ({
              programacao_id: prog.id,
              produto_id: i.produto_id,
              quantidade_total: i.quantidade_total,
              quantidade_produzida: 0,
            })),
          );
        if (e2) {
          console.error("Erro ao criar itens da programação:", e2);
          throw new Error(e2.message);
        }
      }
      return prog;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["op-scheduled"] });
    },
  });
}

function resolveItemStatus(produzida: number, total: number): string {
  if (produzida >= total) return "concluido";
  if (produzida > 0) return "em_producao";
  return "planejado";
}

export function useUpdateScheduledItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      quantidade_produzida: number;
      quantidade_total: number;
      status?: string;
      programacao_id: string;
    }) => {
      const status = input.status ?? resolveItemStatus(input.quantidade_produzida, input.quantidade_total);
      const { error } = await supabase
        .from("op_producoes_programadas_itens")
        .update({ quantidade_produzida: input.quantidade_produzida, status })
        .eq("id", input.id);
      if (error) {
        console.error("Erro ao atualizar item:", error);
        throw new Error(error.message);
      }

      // Recalculate parent programação status
      const { data: allItems, error: fetchErr } = await supabase
        .from("op_producoes_programadas_itens")
        .select("status")
        .eq("programacao_id", input.programacao_id);
      if (fetchErr) {
        console.error("Erro ao buscar itens da programação:", fetchErr);
        return;
      }
      const items = allItems ?? [];
      const allDone = items.length > 0 && items.every((i) => i.status === "concluido");
      const hasInProgress = items.some((i) => i.status === "em_producao");
      let progStatus: string;
      if (allDone) {
        progStatus = "concluido";
      } else if (hasInProgress || items.some((i) => i.status === "concluido")) {
        progStatus = "em_producao";
      } else {
        progStatus = "planejado";
      }
      const { error: progErr } = await supabase
        .from("op_producoes_programadas")
        .update({ status: progStatus })
        .eq("id", input.programacao_id);
      if (progErr) console.error("Erro ao atualizar status da programação:", progErr);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["op-scheduled"] });
    },
  });
}

/** Produce for a scheduled item — does NOT update store stock */
export function useProduceScheduledItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      item_id: string;
      quantidade_adicional: number;
      quantidade_produzida_atual: number;
      quantidade_total: number;
    }) => {
      const novaProduzida = input.quantidade_produzida_atual + input.quantidade_adicional;
      const status = resolveItemStatus(novaProduzida, input.quantidade_total);
      const { error } = await supabase
        .from("op_producoes_programadas_itens")
        .update({ quantidade_produzida: novaProduzida, status })
        .eq("id", input.item_id);
      if (error) {
        console.error("Erro ao registrar produção programada:", error);
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["op-scheduled"] });
    },
  });
}

/* ──────── stock adjustments ──────── */

export const MOTIVOS_AJUSTE = [
  { value: "ajuste_inicial_implantacao", label: "Ajuste inicial de implantação" },
  { value: "correcao_apos_testes", label: "Correção após testes" },
  { value: "contagem_incorreta_anterior", label: "Contagem incorreta anterior" },
  { value: "perda_nao_registrada", label: "Perda não registrada" },
  { value: "sobra_nao_registrada", label: "Sobra não registrada" },
  { value: "outro", label: "Outro" },
] as const;

export function useAdjustStock() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      produto_id: string;
      tipo_ajuste: "positivo" | "negativo" | "zerar";
      quantidade: number;
      motivo: string;
      observacao?: string;
    }) => {
      const { data: existing } = await supabase
        .from("op_estoque_produtos")
        .select("estoque_atual")
        .eq("produto_id", input.produto_id)
        .maybeSingle();
      const anterior = existing?.estoque_atual ?? 0;
      let final_qty: number;
      if (input.tipo_ajuste === "zerar") final_qty = 0;
      else if (input.tipo_ajuste === "positivo") final_qty = anterior + input.quantidade;
      else final_qty = Math.max(0, anterior - input.quantidade);

      const { error: e1 } = await supabase.from("op_ajustes_estoque" as any).insert({
        produto_id: input.produto_id,
        tipo_ajuste: input.tipo_ajuste,
        quantidade_anterior: anterior,
        quantidade_ajustada: input.quantidade,
        quantidade_final: final_qty,
        motivo: input.motivo,
        observacao: input.observacao ?? null,
        ajustado_por: profile?.id ?? null,
      });
      if (e1) throw e1;

      await supabase
        .from("op_estoque_produtos")
        .upsert(
          { produto_id: input.produto_id, estoque_atual: final_qty, updated_at: new Date().toISOString() },
          { onConflict: "produto_id" },
        );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["op-products"] });
    },
  });
}

export function useResetAllStock() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const { data: estoques } = await supabase
        .from("op_estoque_produtos")
        .select("produto_id, estoque_atual");
      const items = (estoques ?? []).filter((e) => e.estoque_atual > 0);
      for (const item of items) {
        await supabase.from("op_ajustes_estoque" as any).insert({
          produto_id: item.produto_id,
          tipo_ajuste: "zerar",
          quantidade_anterior: item.estoque_atual,
          quantidade_ajustada: item.estoque_atual,
          quantidade_final: 0,
          motivo: "reset_inicial_implantacao",
          ajustado_por: profile?.id ?? null,
        });
        await supabase
          .from("op_estoque_produtos")
          .update({ estoque_atual: 0, updated_at: new Date().toISOString() })
          .eq("produto_id", item.produto_id);
      }
      return items.length;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["op-products"] });
    },
  });
}
