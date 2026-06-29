import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
};

type Params = {
  aliquota_imposto: number;
  margem_alvo: number;
  cdi_anual: number;
  custo_hora_mao_obra: number | null;
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (n: number) =>
  `${(n * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

export default function SimuladorProposta() {
  const { data: fichas } = useQuery({
    queryKey: ["fichas_tecnicas", "produto_final"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fichas_tecnicas" as any)
        .select("id, nome, custo_unitario_calculado, precisa_revisao, tipo")
        .eq("tipo", "produto_final")
        .order("nome");
      if (error) throw error;
      return (data as unknown as (Ficha & { tipo: string })[]) ?? [];
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

  const [fichaId, setFichaId] = useState<string>("");
  const [qtd, setQtd] = useState<string>("1");
  const [prazo, setPrazo] = useState<string>("30");
  const [precoVenda, setPrecoVenda] = useState<string>("");
  const [frete, setFrete] = useState<string>("0");

  const ficha = fichas?.find((f) => f.id === fichaId);
  const custoIncompleto =
    !!ficha &&
    (ficha.precisa_revisao === true ||
      !params?.custo_hora_mao_obra ||
      Number(params?.custo_hora_mao_obra) <= 0);

  const calc = useMemo(() => {
    if (!ficha || !params) return null;
    const custo = Number(ficha.custo_unitario_calculado ?? 0);
    const aliq = Number(params.aliquota_imposto ?? 0);
    const margem = Number(params.margem_alvo ?? 0);
    const cdi = Number(params.cdi_anual ?? 0);
    const q = Math.max(0, Number(qtd) || 0);
    const diasCorridos = Math.max(0, Number(prazo) || 0);
    const pv = Math.max(0, Number(precoVenda) || 0);
    const freteTotal = Math.max(0, Number(frete) || 0);

    // Preço mínimo (saudável, sem prazo)
    const denom = 1 - aliq - margem;
    const precoMin = denom > 0 ? custo / denom : Infinity;

    // Custo do prazo
    const taxaDia = Math.pow(1 + cdi, 1 / 252) - 1;
    const diasUteis = Math.round(diasCorridos * (252 / 365));
    const fator = Math.pow(1 + taxaDia, diasUteis);
    const vp = pv / fator;
    const custoPrazoUnit = pv - vp;

    const precoMinAjustado = precoMin + custoPrazoUnit;

    // Margem real (sobre valor presente)
    const margemReal = vp > 0 ? (vp - custo - vp * aliq) / vp : -Infinity;

    // Totais
    const receitaBruta = pv * q;
    const custoTotal = custo * q;
    const impostoTotal = vp * aliq * q;
    const lucroEstimado = vp * q - custoTotal - impostoTotal - freteTotal;

    // Semáforo
    let semaforo: "verde" | "amarelo" | "vermelho" = "vermelho";
    if (vp < custo + vp * aliq) semaforo = "vermelho";
    else if (pv >= precoMinAjustado) semaforo = "verde";
    else semaforo = "amarelo";

    // Desconto máximo
    const espacoDesconto = pv - precoMinAjustado;
    const espacoDescontoPct = pv > 0 ? espacoDesconto / pv : 0;

    return {
      custo,
      aliq,
      margem,
      precoMin,
      taxaDia,
      diasUteis,
      vp,
      custoPrazoUnit,
      precoMinAjustado,
      margemReal,
      receitaBruta,
      custoTotal,
      impostoTotal,
      freteTotal,
      lucroEstimado,
      semaforo,
      espacoDesconto,
      espacoDescontoPct,
      q,
      pv,
    };
  }, [ficha, params, qtd, prazo, precoVenda, frete]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="mb-1 font-display text-2xl font-semibold">
        Simulador de Proposta B2B
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Calcule se um preço de venda B2B é saudável considerando custo, imposto,
        margem e prazo de pagamento.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Inputs */}
        <Card className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label>Produto (ficha técnica)</Label>
            <Select value={fichaId} onValueChange={setFichaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto final" />
              </SelectTrigger>
              <SelectContent>
                {fichas?.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome} — {brl(Number(f.custo_unitario_calculado ?? 0))}/un
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantidade (un)</Label>
              <Input
                type="number"
                min="0"
                value={qtd}
                onChange={(e) => setQtd(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo de pagamento (dias)</Label>
              <Input
                type="number"
                min="0"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                0 = à vista. Ex: 30, 60.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Preço de venda unitário pretendido (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={precoVenda}
              onChange={(e) => setPrecoVenda(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Frete / entrega — total do pedido (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={frete}
              onChange={(e) => setFrete(e.target.value)}
            />
          </div>

          {custoIncompleto && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>
                <strong>Custo incompleto (sem mão de obra)</strong> — esta
                simulação é provisória. Não feche negócio com base nela até
                completar os custos.
              </p>
            </div>
          )}
        </Card>

        {/* Resultados */}
        <Card className="space-y-4 p-6">
          {!calc ? (
            <p className="text-sm text-muted-foreground">
              Selecione um produto e preencha os campos para ver os cálculos.
            </p>
          ) : (
            <>
              <Semaforo
                tipo={calc.semaforo}
                precoMinAjustado={calc.precoMinAjustado}
                margemReal={calc.margemReal}
                margemAlvo={calc.margem}
              />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Linha label="Custo unitário (ficha)" value={brl(calc.custo)} />
                <Linha
                  label="Preço mínimo (saudável)"
                  value={
                    isFinite(calc.precoMin) ? brl(calc.precoMin) : "—"
                  }
                />
                <Linha
                  label="Custo do prazo / un"
                  value={brl(calc.custoPrazoUnit)}
                  hint={`${calc.diasUteis} dias úteis · taxa/dia ${pct(
                    calc.taxaDia,
                  )}`}
                />
                <Linha
                  label="Preço mínimo ajustado ao prazo"
                  value={
                    isFinite(calc.precoMinAjustado)
                      ? brl(calc.precoMinAjustado)
                      : "—"
                  }
                  strong
                />
                <Linha
                  label="Valor presente (un)"
                  value={brl(calc.vp)}
                  hint="preço descontado o prazo"
                />
                <Linha
                  label="Margem real da proposta"
                  value={pct(calc.margemReal)}
                  strong
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Espaço para desconto
                </p>
                {calc.semaforo === "vermelho" || calc.espacoDesconto <= 0 ? (
                  <p className="text-sm font-semibold text-destructive">
                    Sem espaço para desconto.
                  </p>
                ) : (
                  <p className="text-sm">
                    Até <strong>{brl(calc.espacoDesconto)}</strong> (
                    <strong>{pct(calc.espacoDescontoPct)}</strong>) sobre o
                    preço pretendido, mantendo a margem.
                  </p>
                )}
              </div>

              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Totais do pedido ({calc.q} un)
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Linha label="Receita bruta" value={brl(calc.receitaBruta)} />
                  <Linha label="Custo total" value={brl(calc.custoTotal)} />
                  <Linha label="Imposto (sobre VP)" value={brl(calc.impostoTotal)} />
                  <Linha label="Frete" value={brl(calc.freteTotal)} />
                  <Linha
                    label="Lucro estimado (VP)"
                    value={brl(calc.lucroEstimado)}
                    strong
                  />
                </div>
              </div>
            </>
          )}
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

function Semaforo({
  tipo,
  precoMinAjustado,
  margemReal,
  margemAlvo,
}: {
  tipo: "verde" | "amarelo" | "vermelho";
  precoMinAjustado: number;
  margemReal: number;
  margemAlvo: number;
}) {
  if (tipo === "verde") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-green-500 bg-green-50 p-3 text-sm text-green-900">
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div>
          <p className="font-semibold">🟢 Margem saudável</p>
          <p>
            Preço acima do mínimo ajustado ({brl(precoMinAjustado)}). Margem
            real: {pct(margemReal)} (alvo {pct(margemAlvo)}).
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
          <p className="font-semibold">🟡 Cobre o custo, mas abaixo da meta</p>
          <p>
            Cobre custo + imposto + prazo, mas margem real ({pct(margemReal)})
            está abaixo da margem-alvo ({pct(margemAlvo)}). Mínimo ajustado:{" "}
            {brl(precoMinAjustado)}.
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
        <p>
          Preço a valor presente está abaixo do custo + imposto. Você está
          pagando para vender. Mínimo ajustado: {brl(precoMinAjustado)}.
        </p>
      </div>
    </div>
  );
}
