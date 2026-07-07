import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { FileDown } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

type Ficha = {
  id: string;
  nome: string;
  custo_unitario_calculado: number | null;
  precisa_revisao: boolean | null;
  preco_venda_b2c: number | null;
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
  preco: string;
};

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
  qtd: "1",
  preco: "",
});

export default function SimuladorProposta() {
  const { data: fichas } = useQuery({
    queryKey: ["fichas_tecnicas", "produto_final"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fichas_tecnicas" as any)
        .select("id, nome, custo_unitario_calculado, precisa_revisao, preco_venda_b2c, tipo")
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
  const [modoCliente, setModoCliente] = useState<"cadastrado" | "novo">(
    "cadastrado",
  );
  const [clienteId, setClienteId] = useState<string>("");
  const [novoCliente, setNovoCliente] = useState({
    nome: "",
    contato: "",
    telefone: "",
  });
  const [tipoVenda, setTipoVenda] = useState<"b2b" | "evento">("b2b");

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
  const cdi = Number(params?.cdi_anual ?? 0);
  const diasCorridos = Math.max(0, Number(prazo) || 0);
  const taxaDia = Math.pow(1 + cdi, 1 / 252) - 1;
  const diasUteis = Math.round(diasCorridos * (252 / 365));
  const fator = Math.pow(1 + taxaDia, diasUteis);
  const freteTotal = Math.max(0, Number(frete) || 0);

  const custoIncompletoGeral =
    !params?.custo_hora_mao_obra || Number(params?.custo_hora_mao_obra) <= 0;

  const linhas = useMemo(() => {
    return items.map((it) => {
      const ficha = fichas?.find((f) => f.id === it.fichaId);
      const custo = Number(ficha?.custo_unitario_calculado ?? 0);
      const q = Math.max(0, Number(it.qtd) || 0);
      const pv = Math.max(0, Number(it.preco) || 0);
      const denom = 1 - aliq - margemAlvo;
      const precoMin = denom > 0 ? custo / denom : Infinity;
      const vp = pv / fator;
      const custoPrazoUnit = pv - vp;
      const precoMinAjustado = precoMin + custoPrazoUnit;
      const margemReal = vp > 0 ? (vp - custo - vp * aliq) / vp : -Infinity;

      let semaforo: "verde" | "amarelo" | "vermelho" = "vermelho";
      if (!ficha || pv <= 0) semaforo = "vermelho";
      else if (vp < custo + vp * aliq) semaforo = "vermelho";
      else if (pv >= precoMinAjustado) semaforo = "verde";
      else semaforo = "amarelo";

      const b2c = ficha?.preco_venda_b2c != null ? Number(ficha.preco_venda_b2c) : null;
      const margemComprador =
        b2c && b2c > 0 && pv > 0 ? (b2c - pv) / b2c : null;

      const precisaRevisao = !!ficha?.precisa_revisao;

      return {
        item: it,
        ficha,
        custo,
        q,
        pv,
        vp,
        custoPrazoUnit,
        precoMin,
        precoMinAjustado,
        margemReal,
        semaforo,
        b2c,
        margemComprador,
        precisaRevisao,
        // totais por linha
        receita: pv * q,
        custoTotal: custo * q,
        impostoTotal: vp * aliq * q,
        vpTotal: vp * q,
      };
    });
  }, [items, fichas, aliq, margemAlvo, fator]);

  const total = useMemo(() => {
    const receita = linhas.reduce((s, l) => s + l.receita, 0);
    const custoTotal = linhas.reduce((s, l) => s + l.custoTotal, 0) + freteTotal;
    const impostoTotal = linhas.reduce((s, l) => s + l.impostoTotal, 0);
    const vpTotal = linhas.reduce((s, l) => s + l.vpTotal, 0);
    const custoPrazoTotal = receita - vpTotal;
    const lucro = vpTotal - custoTotal - impostoTotal;
    const margemReal = vpTotal > 0 ? lucro / vpTotal : -Infinity;

    let semaforo: "verde" | "amarelo" | "vermelho" = "vermelho";
    if (receita <= 0) semaforo = "vermelho";
    else if (lucro < 0) semaforo = "vermelho";
    else if (margemReal >= margemAlvo) semaforo = "verde";
    else semaforo = "amarelo";

    const algumRevisao = linhas.some((l) => l.precisaRevisao);

    return {
      receita,
      custoTotal,
      impostoTotal,
      vpTotal,
      custoPrazoTotal,
      lucro,
      margemReal,
      semaforo,
      algumRevisao,
    };
  }, [linhas, freteTotal, margemAlvo]);

  const handleGerarPDF = () => {
    const itensValidos = linhas.filter((l) => l.ficha && l.q > 0 && l.pv > 0);
    if (itensValidos.length === 0) {
      toast({
        title: "Nenhum item válido",
        description: "Adicione ao menos um produto com quantidade e preço B2B.",
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
    gerarPropostaPDF({
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
        margemComprador: l.margemComprador,
      })),
    });
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-1 font-display text-2xl font-semibold">
        Simulador de Proposta B2B
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Monte uma proposta com vários itens, defina prazo e frete, e veja a
        margem consolidada + margem do comprador por item.
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
            <Button
              size="sm"
              variant={modoCliente === "cadastrado" ? "default" : "outline"}
              onClick={() => setModoCliente("cadastrado")}
            >
              Cadastrado
            </Button>
            <Button
              size="sm"
              variant={modoCliente === "novo" ? "default" : "outline"}
              onClick={() => setModoCliente("novo")}
            >
              Novo
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-muted/30 p-3">
          <Label className="text-sm font-medium">Tipo de venda</Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={tipoVenda === "b2b" ? "default" : "outline"}
              onClick={() => setTipoVenda("b2b")}
            >
              B2B
            </Button>
            <Button
              size="sm"
              variant={tipoVenda === "evento" ? "default" : "outline"}
              onClick={() => setTipoVenda("evento")}
            >
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
              <Input
                value={novoCliente.nome}
                onChange={(e) =>
                  setNovoCliente({ ...novoCliente, nome: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contato</Label>
              <Input
                value={novoCliente.contato}
                onChange={(e) =>
                  setNovoCliente({ ...novoCliente, contato: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone / WhatsApp</Label>
              <Input
                value={novoCliente.telefone}
                onChange={(e) =>
                  setNovoCliente({ ...novoCliente, telefone: e.target.value })
                }
              />
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

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Produto</TableHead>
                <TableHead className="w-24">Qtd</TableHead>
                <TableHead className="w-32">Preço B2B (R$)</TableHead>
                <TableHead className="w-28">Custo un.</TableHead>
                <TableHead className="w-28">Margem real</TableHead>
                <TableHead className="w-16">Status</TableHead>
                {tipoVenda === "b2b" && (
                  <>
                    <TableHead className="w-28">B2C sugerido</TableHead>
                    <TableHead className="w-32">Margem comprador</TableHead>
                  </>
                )}
                <TableHead className="w-10" />
              </TableRow>

            </TableHeader>
            <TableBody>
              {linhas.map((l) => (
                <TableRow key={l.item.key}>
                  <TableCell>
                    <Select
                      value={l.item.fichaId}
                      onValueChange={(v) => updateItem(l.item.key, { fichaId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {fichas?.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={l.item.qtd}
                      onChange={(e) =>
                        updateItem(l.item.key, { qtd: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.item.preco}
                      onChange={(e) =>
                        updateItem(l.item.key, { preco: e.target.value })
                      }
                      placeholder="0,00"
                    />
                  </TableCell>
                  <TableCell className="text-sm">
                    {l.ficha ? brl(l.custo) : "—"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {l.ficha && l.pv > 0 ? pct(l.margemReal) : "—"}
                  </TableCell>
                  <TableCell>
                    {l.ficha && l.pv > 0 ? (
                      <SemaforoChip tipo={l.semaforo} />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {l.b2c != null ? brl(l.b2c) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {l.margemComprador != null ? pct(l.margemComprador) : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem(l.item.key)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Condições + Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-4 p-6 md:col-span-1">
          <h2 className="font-display text-lg font-semibold">Condições</h2>
          <div className="space-y-1.5">
            <Label>Prazo de pagamento (dias)</Label>
            <Input
              type="number"
              min="0"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              0 = à vista. Taxa/dia útil: {pct(taxaDia)} ({diasUteis} dias úteis)
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Frete / entrega — total (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={frete}
              onChange={(e) => setFrete(e.target.value)}
            />
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
            <Linha
              label="Custo total (+ frete)"
              value={brl(total.custoTotal)}
            />
            <Linha label="Imposto (sobre VP)" value={brl(total.impostoTotal)} />
            <Linha
              label="Custo do prazo"
              value={brl(total.custoPrazoTotal)}
              hint={`${diasCorridos} dias`}
            />
            <Linha label="Valor presente" value={brl(total.vpTotal)} />
            <Linha
              label="Lucro estimado"
              value={brl(total.lucro)}
              strong
            />
            <Linha
              label="Margem real consolidada"
              value={pct(total.margemReal)}
              hint={`alvo ${pct(margemAlvo)}`}
              strong
            />
          </div>

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

function SemaforoChip({ tipo }: { tipo: "verde" | "amarelo" | "vermelho" }) {
  const map = {
    verde: { c: "bg-green-100 text-green-800 border-green-300", t: "🟢" },
    amarelo: { c: "bg-yellow-100 text-yellow-800 border-yellow-300", t: "🟡" },
    vermelho: { c: "bg-red-100 text-red-800 border-red-300", t: "🔴" },
  }[tipo];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${map.c}`}
    >
      {map.t}
    </span>
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
          <p>
            Margem real {pct(margemReal)} ≥ alvo {pct(margemAlvo)}.
          </p>
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
          <p>
            Margem real {pct(margemReal)} abaixo do alvo {pct(margemAlvo)}.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive bg-red-50 p-3 text-sm text-red-900">
      <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
      <div>
        <p className="font-semibold">🔴 PREJUÍZO — não feche neste preço</p>
        <p>Receita não cobre custo + imposto + prazo.</p>
      </div>
    </div>
  );
}
