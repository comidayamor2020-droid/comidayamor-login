// Engine de cálculo de custo encadeado para fichas técnicas.

export type Insumo = {
  id: string;
  nome: string;
  custo_unidade_base: number | null;
  unidade_base: string;
};

export type Componente = {
  id?: string;
  componente_tipo: "insumo" | "ficha";
  insumo_id?: string | null;
  componente_ficha_id?: string | null;
  quantidade: number;
};

export type Ficha = {
  id: string;
  nome: string;
  tipo: "intermediario" | "produto_final";
  rendimento: number | null;
  rendimento_unidade: string | null;
  horas_trabalho: number | null;
  energia_kwh: number | null;
  embalagem_custo: number;
  precisa_revisao?: boolean;
  custo_unitario_calculado?: number | null;
};

export type Parametros = {
  custo_hora_mao_obra: number | null;
  custo_energia_kwh: number | null;
};

export type Breakdown = {
  custoComponentes: number;
  custoMaoObra: number;
  custoEnergia: number;
  custoEmbalagem: number;
  custoTotalLeva: number;
  custoUnitario: number;
  incompleto: boolean; // sem mão de obra
  precisaRevisao: boolean;
  erro?: string;
  linhas: Array<{
    label: string;
    quantidade: number;
    custoUnidade: number;
    subtotal: number;
    faltaCusto: boolean;
  }>;
};

/**
 * Calcula o custo de uma ficha, resolvendo encadeamento recursivo.
 * Detecta ciclos.
 */
export function calcularFicha(params: {
  ficha: Ficha;
  componentes: Componente[];
  todasFichas: Ficha[];
  componentesPorFicha: Record<string, Componente[]>;
  insumosById: Record<string, Insumo>;
  parametros: Parametros;
  // Para detecção de ciclo
  stack?: Set<string>;
  cache?: Map<string, Breakdown>;
}): Breakdown {
  const {
    ficha, componentes, todasFichas, componentesPorFicha,
    insumosById, parametros,
  } = params;
  const stack = params.stack ?? new Set<string>();
  const cache = params.cache ?? new Map<string, Breakdown>();

  if (ficha.id && cache.has(ficha.id)) return cache.get(ficha.id)!;
  if (ficha.id && stack.has(ficha.id)) {
    return {
      custoComponentes: 0, custoMaoObra: 0, custoEnergia: 0, custoEmbalagem: 0,
      custoTotalLeva: 0, custoUnitario: 0,
      incompleto: false, precisaRevisao: true,
      erro: `Referência circular detectada na ficha "${ficha.nome}".`,
      linhas: [],
    };
  }
  if (ficha.id) stack.add(ficha.id);

  let custoComponentes = 0;
  let precisaRevisao = false;
  const linhas: Breakdown["linhas"] = [];
  let erro: string | undefined;

  for (const c of componentes) {
    let custoUnidade = 0;
    let label = "—";
    let faltaCusto = false;
    if (c.componente_tipo === "insumo" && c.insumo_id) {
      const ins = insumosById[c.insumo_id];
      label = ins ? `${ins.nome} (${ins.unidade_base})` : "Insumo removido";
      const cu = Number(ins?.custo_unidade_base ?? 0);
      if (!ins || !cu) { faltaCusto = true; precisaRevisao = true; }
      custoUnidade = cu;
    } else if (c.componente_tipo === "ficha" && c.componente_ficha_id) {
      const sub = todasFichas.find((f) => f.id === c.componente_ficha_id);
      label = sub ? `${sub.nome} (ficha)` : "Ficha removida";
      if (!sub) {
        faltaCusto = true; precisaRevisao = true;
      } else {
        const subBd = calcularFicha({
          ficha: sub,
          componentes: componentesPorFicha[sub.id] ?? [],
          todasFichas, componentesPorFicha, insumosById, parametros,
          stack, cache,
        });
        if (subBd.erro) { erro = subBd.erro; precisaRevisao = true; }
        custoUnidade = subBd.custoUnitario;
        if (!custoUnidade) { faltaCusto = true; precisaRevisao = true; }
      }
    }
    const subtotal = Number(c.quantidade || 0) * custoUnidade;
    custoComponentes += subtotal;
    linhas.push({ label, quantidade: Number(c.quantidade || 0), custoUnidade, subtotal, faltaCusto });
  }

  const horas = Number(ficha.horas_trabalho ?? 0);
  const kwh = Number(ficha.energia_kwh ?? 0);
  const cHora = Number(parametros.custo_hora_mao_obra ?? 0);
  const cKwh = Number(parametros.custo_energia_kwh ?? 0);

  const custoMaoObra = horas * cHora;
  const custoEnergia = kwh * cKwh;
  const custoEmbalagem = Number(ficha.embalagem_custo ?? 0);
  const incompleto = horas > 0 && cHora <= 0;

  const custoTotalLeva = custoComponentes + custoMaoObra + custoEnergia;
  const rendimento = Number(ficha.rendimento ?? 0);
  const custoUnitario = rendimento > 0
    ? (custoTotalLeva / rendimento) + custoEmbalagem
    : 0;
  if (rendimento <= 0) precisaRevisao = true;

  const bd: Breakdown = {
    custoComponentes, custoMaoObra, custoEnergia, custoEmbalagem,
    custoTotalLeva, custoUnitario,
    incompleto, precisaRevisao, erro, linhas,
  };
  if (ficha.id) {
    cache.set(ficha.id, bd);
    stack.delete(ficha.id);
  }
  return bd;
}
