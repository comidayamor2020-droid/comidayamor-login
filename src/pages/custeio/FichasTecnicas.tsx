import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MaoObraAlert } from "@/components/custeio/MaoObraAlert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Plus, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/format";
import {
  calcularFicha, type Componente, type Ficha, type Insumo, type Parametros,
} from "@/lib/custeio";

type ComponenteRow = Componente & { _key: string };

const EMPTY_FICHA = {
  nome: "",
  tipo: "intermediario" as "intermediario" | "produto_final",
  rendimento: "",
  rendimento_unidade: "g" as "g" | "ml" | "un",
  horas_trabalho: "",
  energia_kwh: "",
  embalagem_custo: "",
  preco_venda_b2c: "",
  margem_faixa_1: "",
  margem_faixa_2: "",
  margem_faixa_3: "",
  validade_dias: "",
  conservacao: "Temperatura ambiente" as "Temperatura ambiente" | "Refrigerado" | "Congelado",
  alergenicos: "",
  claims: "Sem glúten • Sem açúcar • Sem lactose",
};


export const MARGEM_MINIMA_PCT = 45;

export default function FichasTecnicas() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FICHA);
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "intermediario" | "produto_final">("todos");
  const [componentes, setComponentes] = useState<ComponenteRow[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: fichas = [] } = useQuery({
    queryKey: ["fichas_tecnicas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fichas_tecnicas" as any).select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as Ficha[];
    },
  });

  const { data: insumos = [] } = useQuery({
    queryKey: ["custeio_insumos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custeio_insumos" as any).select("id,nome,custo_unidade_base,unidade_base").order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as Insumo[];
    },
  });

  const { data: parametros } = useQuery({
    queryKey: ["parametros_custeio", "calc"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parametros_custeio" as any).select("*").limit(1).maybeSingle();
      return (data ?? { custo_hora_mao_obra: 0, custo_energia_kwh: 0 }) as unknown as Parametros;
    },
  });

  const { data: todosComponentes = [] } = useQuery({
    queryKey: ["ficha_componentes_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ficha_componentes" as any).select("*");
      if (error) throw error;
      return (data ?? []) as unknown as (Componente & { id: string; ficha_id: string })[];
    },
  });

  const insumosById = useMemo(() => {
    const m: Record<string, Insumo> = {};
    insumos.forEach((i) => (m[i.id] = i));
    return m;
  }, [insumos]);

  const componentesPorFicha = useMemo(() => {
    const m: Record<string, Componente[]> = {};
    todosComponentes.forEach((c) => {
      if (!m[c.ficha_id]) m[c.ficha_id] = [];
      m[c.ficha_id].push(c);
    });
    return m;
  }, [todosComponentes]);

  // Cálculo ao vivo da ficha em edição
  const fichaAtual: Ficha = {
    id: editing ?? "__draft__",
    nome: form.nome,
    tipo: form.tipo,
    rendimento: Number(form.rendimento || 0),
    rendimento_unidade: form.rendimento_unidade,
    horas_trabalho: Number(form.horas_trabalho || 0),
    energia_kwh: Number(form.energia_kwh || 0),
    embalagem_custo: Number(form.embalagem_custo || 0),
  };

  // Para o cálculo ao vivo, usa as fichas atuais com suas versões salvas,
  // exceto a que está sendo editada (usa o draft em memória).
  const fichasParaCalc = useMemo(() => {
    const out = [...fichas];
    const idx = out.findIndex((f) => f.id === editing);
    if (editing && idx >= 0) out[idx] = fichaAtual;
    return out;
  }, [fichas, editing, fichaAtual]);

  const componentesParaCalc = useMemo(() => {
    const m = { ...componentesPorFicha };
    if (editing) m[editing] = componentes;
    return m;
  }, [componentesPorFicha, editing, componentes]);

  const breakdown = calcularFicha({
    ficha: editing ? fichaAtual : { ...fichaAtual, id: "__draft__" },
    componentes,
    todasFichas: editing ? fichasParaCalc : [...fichas, fichaAtual],
    componentesPorFicha: componentesParaCalc,
    insumosById,
    parametros: parametros ?? { custo_hora_mao_obra: 0, custo_energia_kwh: 0 },
  });

  // Lista com custos atualizados
  const fichasComCusto = useMemo(() => {
    return fichas.map((f) => {
      const bd = calcularFicha({
        ficha: f,
        componentes: componentesPorFicha[f.id] ?? [],
        todasFichas: fichas,
        componentesPorFicha,
        insumosById,
        parametros: parametros ?? { custo_hora_mao_obra: 0, custo_energia_kwh: 0 },
      });
      return { ...f, _bd: bd };
    });
  }, [fichas, componentesPorFicha, insumosById, parametros]);

  function reset() {
    setEditing(null);
    setForm(EMPTY_FICHA);
    setComponentes([]);
  }

  async function startEdit(f: Ficha) {
    setEditing(f.id);
    setForm({
      nome: f.nome,
      tipo: f.tipo,
      rendimento: f.rendimento != null ? String(f.rendimento) : "",
      rendimento_unidade: (f.rendimento_unidade ?? "g") as "g" | "ml" | "un",
      horas_trabalho: f.horas_trabalho != null ? String(f.horas_trabalho) : "",
      energia_kwh: f.energia_kwh != null ? String(f.energia_kwh) : "",
      embalagem_custo: f.embalagem_custo != null ? String(f.embalagem_custo) : "",
      preco_venda_b2c: (f as any).preco_venda_b2c != null ? String((f as any).preco_venda_b2c) : "",
      margem_faixa_1: (f as any).margem_faixa_1 != null ? String((f as any).margem_faixa_1) : "",
      margem_faixa_2: (f as any).margem_faixa_2 != null ? String((f as any).margem_faixa_2) : "",
      margem_faixa_3: (f as any).margem_faixa_3 != null ? String((f as any).margem_faixa_3) : "",
      validade_dias: (f as any).validade_dias != null ? String((f as any).validade_dias) : "",
      conservacao: ((f as any).conservacao ?? "Temperatura ambiente") as "Temperatura ambiente" | "Refrigerado" | "Congelado",
      alergenicos: (f as any).alergenicos ?? "",
      claims: (f as any).claims ?? "Sem glúten • Sem açúcar • Sem lactose",
    });
    const { data } = await supabase
      .from("ficha_componentes" as any).select("*").eq("ficha_id", f.id);
    const rows = (data ?? []) as any[];
    setComponentes(rows.map((r, idx) => ({
      _key: r.id ?? `${idx}`,
      componente_tipo: r.componente_tipo,
      insumo_id: r.insumo_id,
      componente_ficha_id: r.componente_ficha_id,
      quantidade: Number(r.quantidade),
    })));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addComponente() {
    setComponentes((cs) => [
      ...cs,
      { _key: crypto.randomUUID(), componente_tipo: "insumo", insumo_id: null, componente_ficha_id: null, quantidade: 0 },
    ]);
  }
  function removeComponente(key: string) {
    setComponentes((cs) => cs.filter((c) => c._key !== key));
  }
  function updateComponente(key: string, patch: Partial<ComponenteRow>) {
    setComponentes((cs) => cs.map((c) => c._key === key ? { ...c, ...patch } : c));
  }

  async function handleSave() {
    if (!form.nome.trim()) {
      toast({ title: "Informe o nome da ficha", variant: "destructive" }); return;
    }
    if (breakdown.erro) {
      toast({ title: "Referência circular", description: breakdown.erro, variant: "destructive" }); return;
    }
    // valida componentes
    for (const c of componentes) {
      if (c.componente_tipo === "insumo" && !c.insumo_id) {
        toast({ title: "Selecione o insumo de cada componente", variant: "destructive" }); return;
      }
      if (c.componente_tipo === "ficha" && !c.componente_ficha_id) {
        toast({ title: "Selecione a ficha de cada componente", variant: "destructive" }); return;
      }
      if (!(Number(c.quantidade) > 0)) {
        toast({ title: "Informe a quantidade de cada componente", variant: "destructive" }); return;
      }
    }
    // valida margens-alvo (piso 45%)
    const margens: Array<[string, string]> = [
      ["margem_faixa_1", form.margem_faixa_1],
      ["margem_faixa_2", form.margem_faixa_2],
      ["margem_faixa_3", form.margem_faixa_3],
    ];
    for (const [_, val] of margens) {
      if (val !== "" && Number(val) < MARGEM_MINIMA_PCT) {
        toast({ title: "Margem inválida", description: "A margem mínima permitida é 45%.", variant: "destructive" });
        return;
      }
    }
    setSaving(true);

    const payload = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      rendimento: form.rendimento ? Number(form.rendimento) : null,
      rendimento_unidade: form.rendimento_unidade,
      horas_trabalho: form.horas_trabalho ? Number(form.horas_trabalho) : null,
      energia_kwh: form.energia_kwh ? Number(form.energia_kwh) : null,
      embalagem_custo: Number(form.embalagem_custo || 0),
      preco_venda_b2c: form.preco_venda_b2c ? Number(form.preco_venda_b2c) : null,
      margem_faixa_1: form.margem_faixa_1 ? Number(form.margem_faixa_1) : null,
      margem_faixa_2: form.margem_faixa_2 ? Number(form.margem_faixa_2) : null,
      margem_faixa_3: form.margem_faixa_3 ? Number(form.margem_faixa_3) : null,
      validade_dias: form.validade_dias ? Number(form.validade_dias) : null,
      conservacao: form.conservacao || null,
      alergenicos: form.alergenicos.trim() || null,
      claims: form.claims.trim() || null,
      precisa_revisao: breakdown.precisaRevisao,
      custo_unitario_calculado: breakdown.custoUnitario || null,
    };


    let fichaId = editing;
    if (editing) {
      const { error } = await supabase.from("fichas_tecnicas" as any).update(payload).eq("id", editing);
      if (error) { setSaving(false); toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    } else {
      const { data, error } = await supabase.from("fichas_tecnicas" as any).insert(payload).select("id").single();
      if (error || !data) { setSaving(false); toast({ title: "Erro ao criar", description: error?.message, variant: "destructive" }); return; }
      fichaId = (data as any).id;
    }

    // Substitui componentes
    await supabase.from("ficha_componentes" as any).delete().eq("ficha_id", fichaId);
    if (componentes.length > 0) {
      const rows = componentes.map((c) => ({
        ficha_id: fichaId,
        componente_tipo: c.componente_tipo,
        insumo_id: c.componente_tipo === "insumo" ? c.insumo_id : null,
        componente_ficha_id: c.componente_tipo === "ficha" ? c.componente_ficha_id : null,
        quantidade: Number(c.quantidade),
      }));
      const { error: errC } = await supabase.from("ficha_componentes" as any).insert(rows);
      if (errC) { setSaving(false); toast({ title: "Erro ao salvar componentes", description: errC.message, variant: "destructive" }); return; }
    }

    setSaving(false);
    toast({ title: editing ? "Ficha atualizada" : "Ficha criada" });
    reset();
    qc.invalidateQueries({ queryKey: ["fichas_tecnicas"] });
    qc.invalidateQueries({ queryKey: ["ficha_componentes_all"] });
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta ficha? Os componentes também serão removidos.")) return;
    const { error } = await supabase.from("fichas_tecnicas" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ficha excluída" });
      if (editing === id) reset();
      qc.invalidateQueries({ queryKey: ["fichas_tecnicas"] });
      qc.invalidateQueries({ queryKey: ["ficha_componentes_all"] });
    }
  }

  const fichasDisponiveis = fichas.filter((f) => f.id !== editing);

  return (
    <DashboardLayout>
      <h1 className="mb-1 font-display text-2xl font-semibold">Fichas Técnicas</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Receitas com custeio encadeado. Componentes podem ser insumos ou outras fichas.
      </p>

      <MaoObraAlert />

      <Card className="mb-6 p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">
          {editing ? "Editar ficha" : "Nova ficha"}
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Nome</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Brigadeiro tradicional" />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v: any) => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="intermediario">Intermediário</SelectItem>
                <SelectItem value="produto_final">Produto final</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Rendimento da leva</Label>
            <Input type="number" step="0.0001" value={form.rendimento}
              onChange={(e) => setForm({ ...form, rendimento: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Unidade do rendimento</Label>
            <Select value={form.rendimento_unidade} onValueChange={(v: any) => setForm({ ...form, rendimento_unidade: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="g">g</SelectItem>
                <SelectItem value="ml">ml</SelectItem>
                <SelectItem value="un">un</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Horas de trabalho (ativo)</Label>
            <Input type="number" step="0.01" value={form.horas_trabalho}
              onChange={(e) => setForm({ ...form, horas_trabalho: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Energia (kWh)</Label>
            <Input type="number" step="0.01" value={form.energia_kwh}
              onChange={(e) => setForm({ ...form, energia_kwh: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Custo de embalagem por unidade (R$)</Label>
            <Input type="number" step="0.0001" value={form.embalagem_custo}
              onChange={(e) => setForm({ ...form, embalagem_custo: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>
              Preço de venda B2C — varejo (R$)
              {form.tipo === "intermediario" && (
                <span className="ml-1 text-xs text-muted-foreground">(opcional)</span>
              )}
            </Label>
            <Input type="number" step="0.01" value={form.preco_venda_b2c}
              onChange={(e) => setForm({ ...form, preco_venda_b2c: e.target.value })}
              placeholder="—" />
          </div>

        </div>

        {/* Margens-alvo B2B por faixa de quantidade */}
        <div className="mt-6 rounded-lg border border-border/60 bg-muted/30 p-4">
          <h3 className="mb-1 font-display text-base font-semibold">Margens-alvo B2B por faixa de quantidade</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Percentual de margem sobre o preço de venda B2B. Mínimo 45%. O preço unitário é calculado como
            <span className="mx-1 font-mono">custo / (1 − margem)</span>.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {([
              ["margem_faixa_1", "Faixa 1 — 15 a 29 un (%)"],
              ["margem_faixa_2", "Faixa 2 — 30 a 59 un (%)"],
              ["margem_faixa_3", "Faixa 3 — 60+ un (%)"],
            ] as const).map(([key, label]) => {
              const val = form[key];
              const num = Number(val);
              const abaixo = val !== "" && num < MARGEM_MINIMA_PCT;
              const custo = breakdown.custoUnitario;
              const preco = val !== "" && num < 100 && custo > 0
                ? custo / (1 - num / 100)
                : null;
              return (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="45"
                    value={val}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder="Ex.: 55"
                    className={abaixo ? "border-destructive" : ""}
                  />
                  {abaixo && (
                    <p className="text-xs text-destructive">Mínimo 45%.</p>
                  )}
                  {preco != null && !abaixo && (
                    <p className="text-xs text-muted-foreground">
                      Preço B2B calc.: <strong>{formatBRL(preco)}</strong>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Informações do produto (rótulo comercial) */}
        <div className="mt-6 rounded-lg border border-border/60 bg-muted/30 p-4">
          <h3 className="mb-1 font-display text-base font-semibold">Informações do produto</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Exibidas no PDF da proposta comercial (validade, conservação, claims e alergênicos).
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Validade (dias) *</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.validade_dias}
                onChange={(e) => setForm({ ...form, validade_dias: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Conservação *</Label>
              <Select
                value={form.conservacao}
                onValueChange={(v: any) => setForm({ ...form, conservacao: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Temperatura ambiente">Temperatura ambiente</SelectItem>
                  <SelectItem value="Refrigerado">Refrigerado</SelectItem>
                  <SelectItem value="Congelado">Congelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Claims *</Label>
              <Input
                value={form.claims}
                onChange={(e) => setForm({ ...form, claims: e.target.value })}
                placeholder="Sem glúten • Sem açúcar • Sem lactose"
              />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label>Alergênicos (opcional)</Label>
              <Input
                value={form.alergenicos}
                onChange={(e) => setForm({ ...form, alergenicos: e.target.value })}
                placeholder="Ex.: Contém castanhas. Pode conter traços de amendoim."
              />
            </div>
          </div>
        </div>




        {/* Componentes */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Componentes</h3>
            <Button size="sm" variant="outline" onClick={addComponente}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar componente
            </Button>
          </div>

          {componentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum componente. Adicione insumos ou fichas.</p>
          ) : (
            <div className="space-y-2">
              {componentes.map((c, idx) => {
                const bdLinha = breakdown.linhas[idx];
                return (
                  <div key={c._key} className="grid items-end gap-2 rounded-lg border p-3 md:grid-cols-12">
                    <div className="md:col-span-2">
                      <Label className="text-xs">Tipo</Label>
                      <Select
                        value={c.componente_tipo}
                        onValueChange={(v: any) => updateComponente(c._key, {
                          componente_tipo: v,
                          insumo_id: null,
                          componente_ficha_id: null,
                        })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="insumo">Insumo</SelectItem>
                          <SelectItem value="ficha">Ficha</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-5">
                      <Label className="text-xs">{c.componente_tipo === "insumo" ? "Insumo" : "Ficha"}</Label>
                      {c.componente_tipo === "insumo" ? (
                        <Select
                          value={c.insumo_id ?? ""}
                          onValueChange={(v) => updateComponente(c._key, { insumo_id: v })}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                          <SelectContent>
                            {insumos.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.nome} — {formatBRL(Number(i.custo_unidade_base ?? 0))}/{i.unidade_base}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select
                          value={c.componente_ficha_id ?? ""}
                          onValueChange={(v) => updateComponente(c._key, { componente_ficha_id: v })}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                          <SelectContent>
                            {fichasDisponiveis.length === 0 ? (
                              <div className="px-2 py-1 text-xs text-muted-foreground">Nenhuma outra ficha.</div>
                            ) : fichasDisponiveis.map((f) => (
                              <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Quantidade</Label>
                      <Input type="number" step="0.0001" value={c.quantidade}
                        onChange={(e) => updateComponente(c._key, { quantidade: Number(e.target.value) })} />
                    </div>
                    <div className="md:col-span-2 text-sm">
                      <Label className="text-xs">Subtotal</Label>
                      <div className="flex h-10 items-center rounded-md border bg-muted px-3">
                        {bdLinha ? formatBRL(bdLinha.subtotal) : "—"}
                        {bdLinha?.faltaCusto && (
                          <AlertTriangle className="ml-2 h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      <Button size="icon" variant="ghost" onClick={() => removeComponente(c._key)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Breakdown */}
        <div className="mt-6 rounded-lg border bg-muted/40 p-4 text-sm">
          {breakdown.erro && (
            <div className="mb-2 rounded border border-destructive bg-destructive/10 p-2 text-destructive">
              {breakdown.erro}
            </div>
          )}
          <div className="grid gap-1 md:grid-cols-2">
            <div>Custo dos componentes: <strong>{formatBRL(breakdown.custoComponentes)}</strong></div>
            <div>Custo mão de obra: <strong>{formatBRL(breakdown.custoMaoObra)}</strong></div>
            <div>Custo energia: <strong>{formatBRL(breakdown.custoEnergia)}</strong></div>
            <div>Custo total da leva: <strong>{formatBRL(breakdown.custoTotalLeva)}</strong></div>
            <div>Rendimento: <strong>{Number(form.rendimento || 0)} {form.rendimento_unidade}</strong></div>
            <div>Embalagem (por unidade): <strong>{formatBRL(breakdown.custoEmbalagem)}</strong></div>
            <div className="md:col-span-2 mt-2 border-t pt-2">
              Custo unitário: <strong className="text-base">{formatBRL(breakdown.custoUnitario)}</strong> / {form.rendimento_unidade}
              {breakdown.incompleto && (
                <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-700">Sem mão de obra</Badge>
              )}
              {breakdown.precisaRevisao && (
                <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-700">Precisa revisão</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : editing ? "Atualizar ficha" : "Criar ficha"}
          </Button>
          {editing && <Button variant="outline" onClick={reset} disabled={saving}>Cancelar</Button>}
        </div>
      </Card>

      <Card className="mb-3 flex flex-wrap items-center gap-2 p-3">
        <span className="text-sm text-muted-foreground">Filtrar por tipo:</span>
        <Button size="sm" variant={filtroTipo === "todos" ? "default" : "outline"} onClick={() => setFiltroTipo("todos")}>Todos</Button>
        <Button size="sm" variant={filtroTipo === "intermediario" ? "default" : "outline"} onClick={() => setFiltroTipo("intermediario")}>Intermediário</Button>
        <Button size="sm" variant={filtroTipo === "produto_final" ? "default" : "outline"} onClick={() => setFiltroTipo("produto_final")}>Produto final</Button>
        <span className="ml-auto text-xs text-muted-foreground">
          Insumos ficam em <a href="/custeio/insumos" className="underline">Insumos</a>
        </span>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Rendimento</TableHead>
              <TableHead className="text-right">Custo unitário</TableHead>
              <TableHead className="text-right">B2C (varejo)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              const lista = fichasComCusto.filter((f) => filtroTipo === "todos" ? true : f.tipo === filtroTipo);
              if (lista.length === 0) return (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhuma ficha encontrada.</TableCell></TableRow>
            ); return lista.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.nome}</TableCell>
                <TableCell className="text-xs">{f.tipo === "produto_final" ? "Produto final" : "Intermediário"}</TableCell>
                <TableCell className="text-right">{f.rendimento ?? "—"} {f.rendimento_unidade ?? ""}</TableCell>
                <TableCell className="text-right">
                  {f._bd.custoUnitario > 0 ? `${formatBRL(f._bd.custoUnitario)} / ${f.rendimento_unidade ?? ""}` : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {(f as any).preco_venda_b2c != null ? formatBRL(Number((f as any).preco_venda_b2c)) : "—"}
                </TableCell>
                <TableCell>
                  {f._bd.precisaRevisao && (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                      <AlertTriangle className="mr-1 h-3 w-3" /> Revisão
                    </Badge>
                  )}
                  {f._bd.incompleto && (
                    <Badge variant="outline" className="ml-1 border-yellow-500 text-yellow-700">Sem MO</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(f)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(f.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )); })()}
          </TableBody>
        </Table>
      </Card>
    </DashboardLayout>
  );
}
