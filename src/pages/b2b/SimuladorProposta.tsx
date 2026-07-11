import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  FileDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { gerarPropostaPDF, gerarNumeroProposta } from "@/lib/proposta-pdf";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type Ficha = {
  id: string;
  nome: string;
  custo_unitario_calculado: number | null;
  precisa_revisao: boolean | null;
  preco_venda_b2c: number | null;
  margem_faixa_1: number | null;
  margem_faixa_2: number | null;
  margem_faixa_3: number | null;
};

type Cliente = {
  id: string;
  company_name: string;
  trade_name: string | null;
  contact_name: string | null;
};

type Params = {
  aliquota_imposto: number;
  margem_alvo: number;
  cdi_anual: number;
  custo_hora_mao_obra: number | null;
};

type Item = {
  key: string;
  fichaId: string;
  qtd: string;
};

// Faixas de quantidade (padrão global)
export const FAIXAS = [
  { idx: 0, min: 15, max: 29, label: "15–29 un" },
  { idx: 1, min: 30, max: 59, label: "30–59 un" },
  { idx: 2, min: 60, max: Infinity, label: "60+ un" },
] as const;

export const QTD_MINIMA = 15;

const brl = (n: number) =>
  isFinite(n)
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";
const pct = (n: number) =>
  isFinite(n)
    ? `${(n * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
    : "—";

const newItem = (): Item => ({
  key: crypto.randomUUID(),
  fichaId: "",
  qtd: "15",
});

function faixaDaQtd(q: number) {
  return FAIXAS.find((f) => q >= f.min && q <= f.max) ?? null;
}

function precoFaixa(custo: number, margemPct: number | null | undefined): number | null {
  if (custo <= 0) return null;
  if (margemPct == null || !isFinite(Number(margemPct))) return null;
  const m = Number(margemPct) / 100;
  if (m >= 1) return null;
  return custo / (1 - m);
}

// Margens padrão do modo B2B (fixas, aplicadas a todos os produtos que não têm override)
export const MARGENS_B2B_PADRAO: [number, number, number] = [60, 50, 45];
export const MARGEM_MINIMA_PCT = 45;

function margensDaFicha(f: Ficha | undefined) {
  return [f?.margem_faixa_1, f?.margem_faixa_2, f?.margem_faixa_3].map(
    (v) => (v != null ? Number(v) : null),
  );
}

// Margens efetivas por item, dependem do tipoVenda
function margensEfetivas(
  f: Ficha | undefined,
  tipoVenda: "b2b" | "evento",
  eventoMargens: [number, number, number],
): [number, number, number] {
  if (tipoVenda === "evento") return eventoMargens;
  // B2B: usa override do produto (se houver) ou padrão
  const overrides = margensDaFicha(f);
  return [
    overrides[0] ?? MARGENS_B2B_PADRAO[0],
    overrides[1] ?? MARGENS_B2B_PADRAO[1],
    overrides[2] ?? MARGENS_B2B_PADRAO[2],
  ];
}

function precosPorFaixa(
  f: Ficha | undefined,
  margens: [number, number, number],
): Array<number | null> {
  const custo = Number(f?.custo_unitario_calculado ?? 0);
  return margens.map((m) => precoFaixa(custo, m));
}


export default function SimuladorProposta() {
  const { data: fichas } = useQuery({
    queryKey: ["fichas_tecnicas", "produto_final"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fichas_tecnicas" as any)
        .select(
          "id, nome, custo_unitario_calculado, precisa_revisao, preco_venda_b2c, tipo, margem_faixa_1, margem_faixa_2, margem_faixa_3",
        )
        .eq("tipo", "produto_final")
        .order("nome");
      if (error) throw error;
      return (data as unknown as Ficha[]) ?? [];
    },
  });

  const { data: clientes } = useQuery({
    queryKey: ["b2b_companies", "simulador"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("b2b_companies")
        .select("id, company_name, trade_name, contact_name")
        .order("company_name");
      if (error) throw error;
      return (data as Cliente[]) ?? [];
    },
  });

  const { data: params } = useQuery({
    queryKey: ["parametros_custeio", "simulador"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parametros_custeio" as any)
        .select("aliquota_imposto, margem_alvo, cdi_anual, custo_hora_mao_obra")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Params | null;
    },
  });

  // Cliente
  const [modoCliente, setModoCliente] = useState<"cadastrado" | "novo">("cadastrado");
  const [clienteId, setClienteId] = useState<string>("");
  const [novoCliente, setNovoCliente] = useState({ nome: "", contato: "", telefone: "" });
  const [tipoVenda, setTipoVenda] = useState<"b2b" | "evento">("b2b");
  // Margens editáveis apenas no modo Evento (por proposta, não altera padrão global)
  const [eventoMargens, setEventoMargens] = useState<[string, string, string]>([
    String(MARGENS_B2B_PADRAO[0]),
    String(MARGENS_B2B_PADRAO[1]),
    String(MARGENS_B2B_PADRAO[2]),
  ]);
  const eventoMargensNum: [number, number, number] = [
    Number(eventoMargens[0]) || 0,
    Number(eventoMargens[1]) || 0,
    Number(eventoMargens[2]) || 0,
  ];
  const eventoMargensInvalidas = tipoVenda === "evento"
    && eventoMargensNum.some((m) => m < MARGEM_MINIMA_PCT);

  // Condições
  const [prazo, setPrazo] = useState<string>("30");
  const [frete, setFrete] = useState<string>("0");

  // Itens
  const [items, setItems] = useState<Item[]>([newItem()]);
  const updateItem = (key: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const removeItem = (key: string) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.key !== key)));

  const aliq = Number(params?.aliquota_imposto ?? 0);
  const margemAlvo = Number(params?.margem_alvo ?? 0);
  const freteTotal = Math.max(0, Number(frete) || 0);
  const diasCorridos = Math.max(0, Number(prazo) || 0);

  const custoIncompletoGeral =
    !params?.custo_hora_mao_obra || Number(params?.custo_hora_mao_obra) <= 0;

  const linhas = useMemo(() => {
    return items.map((it) => {
      const ficha = fichas?.find((f) => f.id === it.fichaId);
      const custo = Number(ficha?.custo_unitario_calculado ?? 0);
      const q = Math.max(0, Number(it.qtd) || 0);
      const precos = precosPorFaixa(ficha);
      const faixa = faixaDaQtd(q);
      const preco = faixa ? precos[faixa.idx] : null;
      const pv = preco ?? 0;

      const b2c = ficha?.preco_venda_b2c != null ? Number(ficha.preco_venda_b2c) : null;
      const margemRevenda = b2c && b2c > 0 && pv > 0 ? (b2c - pv) / b2c : null;

      const abaixoMin = q > 0 && q < QTD_MINIMA;
      const faixaSemPreco = q >= QTD_MINIMA && preco == null;
      const receita = pv * q;
      const impostoTotal = pv * aliq * q;
      const custoTotal = custo * q;
      const precisaRevisao = !!ficha?.precisa_revisao;

      return {
        item: it,
        ficha,
        custo,
        q,
        pv,
        preco,
        faixa,
        precos,
        b2c,
        margemRevenda,
        abaixoMin,
        faixaSemPreco,
        receita,
        custoTotal,
        impostoTotal,
        precisaRevisao,
      };
    });
  }, [items, fichas, aliq]);

  const total = useMemo(() => {
    const receita = linhas.reduce((s, l) => s + l.receita, 0);
    const custoTotal = linhas.reduce((s, l) => s + l.custoTotal, 0) + freteTotal;
    const impostoTotal = linhas.reduce((s, l) => s + l.impostoTotal, 0);
    const lucro = receita - custoTotal - impostoTotal;
    const margemReal = receita > 0 ? lucro / receita : -Infinity;

    let semaforo: "verde" | "amarelo" | "vermelho" = "vermelho";
    if (receita <= 0) semaforo = "vermelho";
    else if (lucro < 0) semaforo = "vermelho";
    else if (margemReal >= margemAlvo) semaforo = "verde";
    else semaforo = "amarelo";

    const algumRevisao = linhas.some((l) => l.precisaRevisao);
    const algumAbaixoMin = linhas.some((l) => l.abaixoMin);
    const algumSemPreco = linhas.some((l) => l.faixaSemPreco);

    return {
      receita,
      custoTotal,
      impostoTotal,
      lucro,
      margemReal,
      semaforo,
      algumRevisao,
      algumAbaixoMin,
      algumSemPreco,
    };
  }, [linhas, freteTotal, margemAlvo]);

  const handleGerarPDF = async () => {
    const itensValidos = linhas.filter((l) => l.ficha && l.q >= QTD_MINIMA && l.preco != null);
    if (itensValidos.length === 0) {
      toast({
        title: "Nenhum item válido",
        description: "Adicione ao menos um produto com pedido mínimo de 15 unidades e margens configuradas.",
        variant: "destructive",
      });
      return;
    }
    if (linhas.some((l) => l.abaixoMin)) {
      toast({
        title: "Pedido mínimo",
        description: "Pedido mínimo de 15 unidades por produto.",
        variant: "destructive",
      });
      return;
    }
    const clienteNome =
      modoCliente === "cadastrado"
        ? (() => {
            const c = clientes?.find((x) => x.id === clienteId);
            return c ? c.trade_name || c.company_name : "";
          })()
        : novoCliente.nome.trim();
    if (!clienteNome) {
      toast({
        title: "Cliente não informado",
        description: "Selecione um cliente cadastrado ou preencha o nome.",
        variant: "destructive",
      });
      return;
    }
    await gerarPropostaPDF({
      numero: gerarNumeroProposta(),
      emissao: new Date(),
      validadeDias: 7,
      cliente: clienteNome,
      prazoDias: diasCorridos,
      frete: freteTotal,
      tipoVenda,
      itens: itensValidos.map((l) => ({
        nome: l.ficha!.nome,
        qtd: l.q,
        precoB2B: l.pv,
        b2c: l.b2c,
        margemComprador: l.margemRevenda,
        faixaSelecionadaIdx: l.faixa!.idx,
        faixas: FAIXAS.map((f, idx) => {
          const p = l.precos[idx];
          const mrev = l.b2c && l.b2c > 0 && p != null && p > 0 ? (l.b2c - p) / l.b2c : null;
          return {
            label: f.label,
            preco: p,
            margemRevenda: mrev,
          };
        }),
      })),
    });
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-1 font-display text-2xl font-semibold">
        Simulador de Proposta B2B
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Preço unitário calculado automaticamente pela margem-alvo de cada faixa de quantidade.
      </p>

      {(custoIncompletoGeral || total.algumRevisao) && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            <strong>Custo incompleto (sem mão de obra)</strong> — esta
            simulação é provisória. Não feche negócio com base nela até
            completar os custos.
          </p>
        </div>
      )}

      {/* Cliente */}
      <Card className="mb-4 space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Cliente</h2>
          <div className="flex gap-2">
            <Button size="sm" variant={modoCliente === "cadastrado" ? "default" : "outline"} onClick={() => setModoCliente("cadastrado")}>
              Cadastrado
            </Button>
            <Button size="sm" variant={modoCliente === "novo" ? "default" : "outline"} onClick={() => setModoCliente("novo")}>
              Novo
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-muted/30 p-3">
          <Label className="text-sm font-medium">Tipo de venda</Label>
          <div className="flex gap-2">
            <Button size="sm" variant={tipoVenda === "b2b" ? "default" : "outline"} onClick={() => setTipoVenda("b2b")}>
              B2B
            </Button>
            <Button size="sm" variant={tipoVenda === "evento" ? "default" : "outline"} onClick={() => setTipoVenda("evento")}>
              Evento
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {tipoVenda === "b2b"
              ? "Cliente revendedor — inclui sugestão de revenda e margem do comprador."
              : "Cliente de evento (consumo final) — sem sugestão de revenda."}
          </p>
        </div>

        {modoCliente === "cadastrado" ? (
          <div className="space-y-1.5">
            <Label>Selecione o cliente B2B</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger>
                <SelectValue placeholder="Cliente cadastrado" />
              </SelectTrigger>
              <SelectContent>
                {clientes?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.trade_name || c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Nome / Empresa</Label>
              <Input value={novoCliente.nome} onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Contato</Label>
              <Input value={novoCliente.contato} onChange={(e) => setNovoCliente({ ...novoCliente, contato: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone / WhatsApp</Label>
              <Input value={novoCliente.telefone} onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })} />
            </div>
          </div>
        )}
      </Card>

      {/* Itens */}
      <Card className="mb-4 p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Itens da proposta</h2>
          <Button size="sm" onClick={() => setItems([...items, newItem()])}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar item
          </Button>
        </div>

        <div className="space-y-4">
          {linhas.map((l) => (
            <div key={l.item.key} className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-6">
                  <Label className="text-xs">Produto</Label>
                  <Select
                    value={l.item.fichaId}
                    onValueChange={(v) => updateItem(l.item.key, { fichaId: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {fichas?.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label className="text-xs">Quantidade</Label>
                  <Input
                    type="number"
                    min="0"
                    value={l.item.qtd}
                    onChange={(e) => updateItem(l.item.key, { qtd: e.target.value })}
                    className={l.abaixoMin ? "border-destructive" : ""}
                  />
                  {l.abaixoMin && (
                    <p className="mt-1 text-xs text-destructive">Mínimo 15 un.</p>
                  )}
                </div>

                <div className="md:col-span-3">
                  <Label className="text-xs">Subtotal</Label>
                  <div className="flex h-10 items-center rounded-md border bg-background px-3 text-sm font-semibold">
                    {l.preco != null && l.q >= QTD_MINIMA ? brl(l.receita) : "—"}
                  </div>
                </div>

                <div className="flex items-end justify-end md:col-span-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeItem(l.item.key)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Faixas do produto */}
              {l.ficha && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Faixas de preço B2B (preço unitário calculado)
                  </p>
                  <div className="grid gap-2 md:grid-cols-3">
                    {FAIXAS.map((f) => {
                      const p = l.precos[f.idx];
                      const selecionada = l.faixa?.idx === f.idx;
                      return (
                        <div
                          key={f.idx}
                          className={`rounded-md border p-3 text-sm ${
                            selecionada
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-border/60 bg-background"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">
                              {f.label}
                            </span>
                            {selecionada && (
                              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                                Selecionada
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-base font-semibold">
                            {p != null ? brl(p) : "—"}
                          </div>
                          {p == null && (
                            <p className="text-[11px] text-destructive">
                              Configure a margem no cadastro.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {tipoVenda === "b2b" && l.preco != null && l.faixa && (
                    <div className="mt-3 grid gap-3 text-xs md:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">Sugerido revenda: </span>
                        <strong>{l.b2c != null ? brl(l.b2c) : "—"}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Margem da revenda (faixa selecionada): </span>
                        <strong>{l.margemRevenda != null ? pct(l.margemRevenda) : "—"}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Condições + Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-4 p-6 md:col-span-1">
          <h2 className="font-display text-lg font-semibold">Condições</h2>
          <div className="space-y-1.5">
            <Label>Prazo de pagamento (dias)</Label>
            <Input type="number" min="0" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            <p className="text-xs text-muted-foreground">0 = à vista.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Frete / entrega — total (R$)</Label>
            <Input type="number" min="0" step="0.01" value={frete} onChange={(e) => setFrete(e.target.value)} />
          </div>
        </Card>

        <Card className="space-y-4 p-6 md:col-span-2">
          <h2 className="font-display text-lg font-semibold">Resumo da proposta</h2>

          <SemaforoBox
            tipo={total.semaforo}
            margemReal={total.margemReal}
            margemAlvo={margemAlvo}
          />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Linha label="Receita bruta" value={brl(total.receita)} />
            <Linha label="Custo total (+ frete)" value={brl(total.custoTotal)} />
            <Linha label="Imposto estimado" value={brl(total.impostoTotal)} />
            <Linha label="Lucro estimado" value={brl(total.lucro)} strong />
            <Linha
              label="Margem real consolidada"
              value={pct(total.margemReal)}
              hint={`alvo ${pct(margemAlvo)}`}
              strong
            />
          </div>

          {total.algumAbaixoMin && (
            <p className="text-xs text-destructive">
              Existem itens abaixo do pedido mínimo de 15 unidades.
            </p>
          )}
          {total.algumSemPreco && (
            <p className="text-xs text-destructive">
              Há produtos sem margem configurada para a faixa selecionada.
            </p>
          )}

          <div className="flex justify-end border-t pt-4">
            <Button onClick={handleGerarPDF}>
              <FileDown className="mr-2 h-4 w-4" /> Gerar PDF da proposta
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Linha({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={strong ? "text-base font-semibold" : "text-sm"}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SemaforoBox({
  tipo,
  margemReal,
  margemAlvo,
}: {
  tipo: "verde" | "amarelo" | "vermelho";
  margemReal: number;
  margemAlvo: number;
}) {
  if (tipo === "verde") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-green-500 bg-green-50 p-3 text-sm text-green-900">
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div>
          <p className="font-semibold">🟢 Proposta saudável</p>
          <p>Margem real {pct(margemReal)} ≥ alvo {pct(margemAlvo)}.</p>
        </div>
      </div>
    );
  }
  if (tipo === "amarelo") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-yellow-500 bg-yellow-50 p-3 text-sm text-yellow-900">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div>
          <p className="font-semibold">🟡 Lucra, mas abaixo da meta</p>
          <p>Margem real {pct(margemReal)} abaixo do alvo {pct(margemAlvo)}.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive bg-red-50 p-3 text-sm text-red-900">
      <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
      <div>
        <p className="font-semibold">🔴 PREJUÍZO — não feche neste preço</p>
        <p>Receita não cobre custo + imposto.</p>
      </div>
    </div>
  );
}
