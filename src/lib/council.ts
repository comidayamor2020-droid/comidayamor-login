/** Council member definitions, response structure, and V1 data-driven analysis engine */

import type { CouncilContextData } from "@/hooks/use-council-context";

export interface CouncilMember {
  id: string;
  name: string;
  role: string;
  title: string;
  description: string;
  avatar: string;
  isHuman: boolean;
}

export const COUNCIL_MEMBERS: CouncilMember[] = [
  {
    id: "gustavo",
    name: "Gustavo",
    role: "CEO Humano",
    title: "Fundador & CEO",
    description: "Decisão final, visão do dono, prioridade estratégica e aprovação final.",
    avatar: "👤",
    isHuman: true,
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    role: "CEO Auxiliar / Chief of Staff de IA",
    title: "Chief of Staff IA",
    description: "Consolida análises, organiza prioridades, mostra conflitos e sugere caminhos.",
    avatar: "🧠",
    isHuman: false,
  },
  {
    id: "claude",
    name: "Claude",
    role: "CFO de IA",
    title: "CFO IA",
    description: "Análise financeira, fluxo de caixa, DRE, margem, cenários e risco econômico.",
    avatar: "📊",
    isHuman: false,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    role: "CMO de IA",
    title: "CMO IA",
    description: "Marketing estratégico, tendências, concorrência e oportunidades de posicionamento.",
    avatar: "🎯",
    isHuman: false,
  },
  {
    id: "grok",
    name: "Grok",
    role: "CIO / Contrarian de IA",
    title: "CIO Contrarian IA",
    description: "Contraponto crítico, alertas de risco, questionamento de conclusões frágeis.",
    avatar: "⚡",
    isHuman: false,
  },
  {
    id: "manus",
    name: "Manus",
    role: "CTO / Executor de IA",
    title: "CTO Executor IA",
    description: "Arquitetura, integrações, automações, fluxos técnicos e viabilidade.",
    avatar: "🔧",
    isHuman: false,
  },
];

export const RESPONSE_SECTIONS = [
  { key: "leitura_executiva", label: "Leitura Executiva" },
  { key: "atencao", label: "O que mais merece atenção" },
  { key: "visao_ceo_auxiliar", label: "Visão do CEO Auxiliar (ChatGPT)" },
  { key: "visao_cfo", label: "Visão do CFO (Claude)" },
  { key: "visao_cmo", label: "Visão do CMO (Perplexity)" },
  { key: "visao_cio", label: "Visão do CIO / Contrarian (Grok)" },
  { key: "visao_cto", label: "Visão do CTO / Executor (Manus)" },
  { key: "convergencias", label: "Convergências" },
  { key: "divergencias", label: "Divergências" },
  { key: "sugestao_principal", label: "Sugestão Principal" },
  { key: "alternativas", label: "Alternativas Possíveis" },
  { key: "risco_principal", label: "Risco Principal" },
  { key: "falta_saber", label: "O que ainda falta saber" },
  { key: "proximo_passo", label: "Próximo Passo Sugerido" },
  { key: "nivel_confianca", label: "Nível de Confiança" },
] as const;

export type CouncilResponse = Record<string, string>;

// ────────────────────────────────────────────────
// CONFIDENCE LEVELS
// ────────────────────────────────────────────────

const CONFIDENCE_LABELS = {
  alta: "🟢 Alta confiança — Dados operacionais completos para esta análise.",
  media: "🟡 Média confiança — Dados parciais. Algumas métricas não estão disponíveis.",
  baixa: "🟠 Baixa confiança — Poucos dados disponíveis. Recomendações são preliminares.",
  insuficiente: "🔴 Dados insuficientes — Não há dados operacionais suficientes para uma análise confiável.",
} as const;

// ────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────

function listItems(items: string[], max = 5): string {
  const shown = items.slice(0, max);
  const rest = items.length - max;
  const lines = shown.map((i) => `• ${i}`).join("\n");
  return rest > 0 ? `${lines}\n  ...e mais ${rest} item(ns).` : lines;
}

function plural(n: number, singular: string, pluralStr?: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${pluralStr ?? singular + "s"}`;
}

// ────────────────────────────────────────────────
// SEVERITY ASSESSMENT
// ────────────────────────────────────────────────

interface Severity {
  level: "critico" | "alerta" | "atencao" | "normal";
  reasons: string[];
}

function assessSeverity(ctx: CouncilContextData): Severity {
  const reasons: string[] = [];
  let level: Severity["level"] = "normal";

  if (ctx.belowMinimum.length >= 5) {
    level = "critico";
    reasons.push(`${ctx.belowMinimum.length} produtos abaixo do estoque mínimo`);
  } else if (ctx.belowMinimum.length > 0) {
    if (level === "normal") level = "alerta";
    reasons.push(`${ctx.belowMinimum.length} produto(s) abaixo do mínimo`);
  }

  if (ctx.lossRate > 10) {
    level = "critico";
    reasons.push(`Taxa de perda de ${ctx.lossRate}% (acima de 10%)`);
  } else if (ctx.lossRate > 5) {
    if (level === "normal") level = "alerta";
    reasons.push(`Taxa de perda de ${ctx.lossRate}% (acima de 5%)`);
  }

  if (ctx.divergences.length >= 5) {
    if (level === "normal") level = "alerta";
    reasons.push(`${ctx.divergences.length} divergências na contagem`);
  } else if (ctx.divergences.length > 0) {
    if (level === "normal") level = "atencao";
    reasons.push(`${ctx.divergences.length} divergência(s) na contagem`);
  }

  if (ctx.pendingApprovals >= 5) {
    if (level === "normal") level = "alerta";
    reasons.push(`${ctx.pendingApprovals} aprovações pendentes`);
  } else if (ctx.pendingApprovals > 0) {
    if (level === "normal") level = "atencao";
    reasons.push(`${ctx.pendingApprovals} aprovação(ões) pendente(s)`);
  }

  if (ctx.productionEfficiency < 50 && ctx.totalProducts > 0) {
    if (level === "normal") level = "alerta";
    reasons.push(`Eficiência de estoque em ${ctx.productionEfficiency}%`);
  }

  if (reasons.length === 0) {
    reasons.push("Operação dentro dos parâmetros normais");
  }

  return { level, reasons };
}

// ────────────────────────────────────────────────
// RESPONSE GENERATOR — data-driven V1
// ────────────────────────────────────────────────

export function generateV1Response(
  ctx: CouncilContextData,
  question: string,
): CouncilResponse {
  const resp: CouncilResponse = {};
  const severity = assessSeverity(ctx);
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  // ── 1. LEITURA EXECUTIVA ──
  const statusEmoji =
    severity.level === "critico" ? "🔴" :
    severity.level === "alerta" ? "🟡" :
    severity.level === "atencao" ? "🟠" : "🟢";

  const summaryLines = [
    `${statusEmoji} Status geral: ${severity.level.toUpperCase()}`,
    `Data: ${today}`,
    "",
    `📦 ${plural(ctx.totalProducts, "produto ativo", "produtos ativos")} no sistema`,
    `✅ ${plural(ctx.todayProduced, "unidade produzida", "unidades produzidas")} hoje`,
    `❌ ${plural(ctx.todayLosses, "unidade perdida", "unidades perdidas")} (${ctx.lossRate}% de perda)`,
    `🍽️ ${plural(ctx.todayTastings, "unidade em degustação", "unidades em degustação")}`,
    `📊 Eficiência de estoque: ${ctx.productionEfficiency}% dos produtos atingindo o ideal do dia`,
    "",
    "Pontos de atenção:",
    ...severity.reasons.map((r) => `  → ${r}`),
  ];
  resp.leitura_executiva = summaryLines.join("\n");

  // ── 2. O QUE MAIS MERECE ATENÇÃO ──
  const attentionItems: string[] = [];

  if (ctx.belowMinimum.length > 0) {
    attentionItems.push(
      `🔴 ESTOQUE CRÍTICO — ${plural(ctx.belowMinimum.length, "produto")} abaixo do mínimo:\n` +
      listItems(
        ctx.belowMinimum.map(
          (p) => `${p.name}: ${p.current} un (mínimo: ${p.minimum}, ideal: ${p.ideal})`,
        ),
      ),
    );
  }

  if (ctx.divergences.length > 0) {
    attentionItems.push(
      `⚠️ DIVERGÊNCIAS — ${plural(ctx.divergences.length, "produto")} com contagem diferente do esperado:\n` +
      listItems(
        ctx.divergences.map(
          (d) => `${d.productName}: esperado ${d.expected}, contado ${d.counted} (diferença: ${d.diff > 0 ? "+" : ""}${d.diff})`,
        ),
      ),
    );
  }

  if (ctx.pendingOccurrences.length > 0) {
    attentionItems.push(
      `🔔 PENDÊNCIAS — ${plural(ctx.pendingOccurrences.length, "solicitação", "solicitações")} aguardando aprovação:\n` +
      listItems(
        ctx.pendingOccurrences.map(
          (o) => `${o.productName}: ${o.type} de ${o.quantity} un — motivo: ${o.reason}`,
        ),
      ),
    );
  }

  if (ctx.underProduced.length > 0) {
    attentionItems.push(
      `📉 ABAIXO DO IDEAL — ${plural(ctx.underProduced.length, "produto")} com estoque abaixo do ideal do dia:\n` +
      listItems(
        ctx.underProduced.slice(0, 5).map(
          (p) => `${p.name}: estoque ${p.current} (ideal: ${p.ideal}, faltam ${p.gap} un)`,
        ),
      ),
    );
  }

  if (ctx.overProduced.length > 0) {
    attentionItems.push(
      `📈 ACIMA DO IDEAL — ${plural(ctx.overProduced.length, "produto")} com estoque acima do ideal:\n` +
      listItems(
        ctx.overProduced.slice(0, 3).map(
          (p) => `${p.name}: estoque ${p.current} (ideal: ${p.ideal}, excesso de ${Math.abs(p.gap)} un)`,
        ),
      ),
    );
  }

  if (attentionItems.length === 0) {
    attentionItems.push("✅ Nenhum alerta crítico no momento. Operação estável.");
  }

  resp.atencao = attentionItems.join("\n\n");

  // ── 3. VISÃO CEO AUXILIAR ──
  const ceoLines: string[] = [
    `📋 Pergunta analisada: "${question}"`,
    "",
  ];

  if (severity.level === "critico") {
    ceoLines.push(
      "⚡ PRIORIDADE IMEDIATA: A operação apresenta sinais críticos que exigem ação hoje.",
      "",
    );
  }

  // Priority list based on data
  const priorities: string[] = [];
  if (ctx.belowMinimum.length > 0) priorities.push(`Regularizar estoque dos ${ctx.belowMinimum.length} produto(s) abaixo do mínimo`);
  if (ctx.pendingApprovals > 0) priorities.push(`Aprovar ${ctx.pendingApprovals} solicitação(ões) pendente(s) para liberar a operação`);
  if (ctx.divergences.length > 0) priorities.push(`Investigar ${ctx.divergences.length} divergência(s) de contagem`);
  if (ctx.lossRate > 5) priorities.push(`Reduzir taxa de perda atual (${ctx.lossRate}%)`);
  if (ctx.underProduced.length > 3) priorities.push(`Alinhar produção para ${ctx.underProduced.length} itens abaixo do ideal`);

  if (priorities.length > 0) {
    ceoLines.push("Prioridades sugeridas, em ordem de urgência:");
    priorities.forEach((p, i) => ceoLines.push(`  ${i + 1}. ${p}`));
  } else {
    ceoLines.push("A operação está fluindo dentro dos parâmetros. Recomendo manter o monitoramento e focar em otimizações.");
  }

  if (ctx.activeScheduled.length > 0) {
    const urgent = ctx.activeScheduled.filter((s) => s.priority === "urgente" || s.priority === "alta");
    if (urgent.length > 0) {
      ceoLines.push("", `⚠️ Atenção: ${urgent.length} programação(ões) com prioridade alta/urgente em andamento.`);
    }
  }

  resp.visao_ceo_auxiliar = ceoLines.join("\n");

  // ── 4. VISÃO CFO ──
  const cfoLines: string[] = [];

  if (ctx.todayLosses > 0 || ctx.todayTastings > 0) {
    cfoLines.push("💰 IMPACTO FINANCEIRO DAS PERDAS:");
    if (ctx.todayLosses > 0) {
      cfoLines.push(`  • Perdas: ${ctx.todayLosses} unidades (${ctx.lossRate}% da produção)`);
      if (ctx.lossRate > 5) {
        cfoLines.push(`  ⚠️ Taxa acima do aceitável (5%). Cada ponto percentual reduzido impacta diretamente a margem.`);
      }
    }
    if (ctx.todayTastings > 0) {
      cfoLines.push(`  • Degustações: ${ctx.todayTastings} unidades — considerar se o volume está dentro do planejado.`);
    }
  } else {
    cfoLines.push("✅ Sem perdas ou degustações registradas até o momento.");
  }

  if (ctx.belowMinimum.length > 0) {
    cfoLines.push(
      "",
      `📉 RISCO DE RECEITA: ${ctx.belowMinimum.length} produto(s) com risco de ruptura.`,
      "Ruptura gera perda de venda + insatisfação do cliente + possível desvio para concorrentes.",
    );
  }

  if (ctx.overProduced.length > 0) {
    cfoLines.push(
      "",
      `📈 CAPITAL PARADO: ${ctx.overProduced.length} produto(s) acima do ideal.`,
      "Produção excedente pode gerar perdas por validade ou capital imobilizado em estoque.",
    );
  }

  cfoLines.push("", `📊 Eficiência geral de estoque: ${ctx.productionEfficiency}%`);
  resp.visao_cfo = cfoLines.join("\n");

  // ── 5. VISÃO CMO ──
  const cmoLines: string[] = [];

  if (ctx.belowMinimum.length > 0) {
    cmoLines.push(
      "🎯 RISCO PARA A EXPERIÊNCIA DO CLIENTE:",
      `${ctx.belowMinimum.length} produto(s) em risco de ruptura. Se esses itens são populares, clientes podem migrar.`,
      "",
    );
  }

  if (ctx.overProduced.length > 0) {
    cmoLines.push(
      "💡 OPORTUNIDADE PROMOCIONAL:",
      "Produtos com estoque acima do ideal podem ser impulsionados com ações no Instagram, combos ou degustação estratégica:",
      ...ctx.overProduced.slice(0, 3).map(
        (p) => `  • ${p.name}: ${Math.abs(p.gap)} un acima do ideal — potencial para ação promocional`,
      ),
      "",
    );
  }

  if (ctx.todayProduced > 0) {
    cmoLines.push(
      "📸 CONTEÚDO:",
      `Produção de ${ctx.todayProduced} unidades hoje pode gerar conteúdo para stories/reels mostrando bastidores.`,
    );
  }

  if (cmoLines.length === 0) {
    cmoLines.push("Sem insights de marketing relevantes com os dados disponíveis neste momento.");
  }

  resp.visao_cmo = cmoLines.join("\n");

  // ── 6. VISÃO CIO / CONTRARIAN ──
  const cioLines: string[] = [];

  if (ctx.divergences.length > 0) {
    const bigDivs = ctx.divergences.filter((d) => Math.abs(d.diff) >= 3);
    cioLines.push(
      "🔍 QUESTIONAMENTO SOBRE DIVERGÊNCIAS:",
      `${ctx.divergences.length} produto(s) com contagem divergente.`,
    );
    if (bigDivs.length > 0) {
      cioLines.push(
        `⚠️ ${bigDivs.length} com diferença ≥ 3 unidades — pode indicar problema de processo, não apenas contagem:`,
        ...bigDivs.slice(0, 3).map(
          (d) => `  • ${d.productName}: diferença de ${d.diff > 0 ? "+" : ""}${d.diff} un`,
        ),
      );
    }
    cioLines.push("", "Pergunto: essas divergências são pontuais ou padrão recorrente? Se recorrente, o problema é sistêmico.");
  }

  if (ctx.pendingApprovals > 0) {
    cioLines.push(
      "",
      `⏳ GARGALO DE APROVAÇÃO: ${ctx.pendingApprovals} item(ns) pendente(s).`,
      "Se aprovações travadas são recorrentes, considerar delegar autonomia para o nível operacional em valores menores.",
    );
  }

  if (ctx.lossRate > 0 && ctx.todayProduced > 0) {
    cioLines.push(
      "",
      `📐 PROPORÇÃO PRODUÇÃO/PERDA: ${ctx.lossRate}%.`,
      ctx.lossRate <= 2
        ? "Taxa saudável. Monitorar para manter."
        : ctx.lossRate <= 5
          ? "Taxa aceitável, mas há espaço para melhoria. Investigar causas raiz."
          : "Taxa preocupante. Recomendo auditoria do processo produtivo.",
    );
  }

  if (ctx.dataCompleteness !== "alta") {
    cioLines.push(
      "",
      `🔎 ALERTA DE DADOS: Completude classificada como "${ctx.dataCompleteness}".`,
      "Decisões baseadas em dados parciais têm risco maior. Recomendo cautela nas conclusões.",
    );
  }

  if (cioLines.length === 0) {
    cioLines.push("Sem contrapontos relevantes neste momento. Dados consistentes.");
  }

  resp.visao_cio = cioLines.join("\n");

  // ── 7. VISÃO CTO / EXECUTOR ──
  const ctoLines: string[] = [];

  ctoLines.push(
    "🔧 STATUS DO SISTEMA:",
    `  • Dados carregados: ${ctx.dataCompleteness === "alta" ? "✅ completos" : `⚠️ ${ctx.dataCompleteness}`}`,
    `  • Produtos configurados: ${ctx.totalProducts}`,
    `  • Lotes registrados hoje: ${ctx.todayLotes.length}`,
    `  • Contagens realizadas: ${ctx.divergences.length > 0 ? `sim, com ${ctx.divergences.length} divergência(s)` : "sem divergências"}`,
  );

  const improvements: string[] = [];
  if (ctx.dataCompleteness !== "alta") improvements.push("Completar cadastro de configuração de todos os produtos (estoque mínimo e ideal por dia)");
  if (ctx.divergences.length > 3) improvements.push("Implementar contagem dupla obrigatória para itens de alto valor");
  if (ctx.pendingApprovals > 3) improvements.push("Criar regra de aprovação automática para solicitações de baixo valor");
  if (ctx.belowMinimum.length > 0) improvements.push("Configurar alertas automáticos quando estoque atingir nível crítico");

  if (improvements.length > 0) {
    ctoLines.push("", "🛠️ MELHORIAS TÉCNICAS SUGERIDAS:");
    improvements.forEach((imp, i) => ctoLines.push(`  ${i + 1}. ${imp}`));
  }

  resp.visao_cto = ctoLines.join("\n");

  // ── 8. CONVERGÊNCIAS ──
  const conv: string[] = [];
  if (ctx.belowMinimum.length > 0) conv.push("Todos identificam o risco de ruptura como prioridade");
  if (ctx.lossRate > 5) conv.push("Consenso sobre a necessidade de reduzir a taxa de perda");
  if (ctx.divergences.length > 0) conv.push("Acordo sobre investigar as causas das divergências");
  if (ctx.pendingApprovals > 0) conv.push("Necessidade de agilizar o fluxo de aprovações");
  if (conv.length === 0) conv.push("Operação estável — todos concordam em manter o monitoramento");
  resp.convergencias = conv.map((c) => `✓ ${c}`).join("\n");

  // ── 9. DIVERGÊNCIAS ──
  const div: string[] = [];
  if (ctx.overProduced.length > 0) {
    div.push("CMO quer aproveitar excesso para ações promocionais; CFO prefere reduzir produção para economizar.");
  }
  if (ctx.lossRate > 2) {
    div.push("CIO questiona se o processo produtivo é o problema; CTO sugere solução tecnológica com alertas.");
  }
  if (ctx.pendingApprovals > 0) {
    div.push("CIO sugere delegar aprovações; CFO prefere manter controle centralizado para segurança financeira.");
  }
  if (div.length === 0) div.push("Sem divergências significativas neste momento.");
  resp.divergencias = div.map((d) => `⟡ ${d}`).join("\n");

  // ── 10. SUGESTÃO PRINCIPAL ──
  if (severity.level === "critico") {
    resp.sugestao_principal =
      "🚨 AÇÃO IMEDIATA: Focar 100% na regularização dos produtos em nível crítico.\n\n" +
      (ctx.belowMinimum.length > 0
        ? `Priorizar produção dos seguintes itens:\n${listItems(ctx.belowMinimum.slice(0, 5).map((p) => `${p.name} (faltam ${Math.max(0, p.minimum - p.current)} un para o mínimo)`))}`
        : "Investigar as causas das perdas e divergências e tomar ação corretiva hoje.");
  } else if (severity.level === "alerta") {
    const topAction = ctx.belowMinimum.length > 0
      ? `regularizar o estoque de ${ctx.belowMinimum.length} produto(s) abaixo do mínimo`
      : ctx.divergences.length > 0
        ? `investigar as ${ctx.divergences.length} divergência(s) de contagem`
        : "revisar o fluxo de aprovações pendentes";
    resp.sugestao_principal = `⚡ Prioridade do dia: ${topAction}.\n\nApós resolver, revisar a produção para alinhar com os ideais do dia.`;
  } else {
    resp.sugestao_principal = "✅ Operação estável. Manter monitoramento e focar em otimizações de longo prazo: redução de perdas, melhoria de processos de contagem e automação de alertas.";
  }

  // ── 11. ALTERNATIVAS ──
  const alts: string[] = [];
  if (ctx.belowMinimum.length > 0) {
    alts.push("Produção emergencial focada nos itens críticos");
    alts.push("Ajustar estoque mínimo para refletir a demanda real (pode estar superdimensionado)");
  }
  if (ctx.overProduced.length > 0) {
    alts.push("Promoção relâmpago para escoar excesso antes do vencimento");
    alts.push("Reduzir produção do dia seguinte para equilibrar");
  }
  if (ctx.divergences.length > 0) {
    alts.push("Implementar contagem dupla (dois operadores independentes)");
    alts.push("Revisar processo de registro de saída para identificar falhas");
  }
  if (alts.length === 0) {
    alts.push("Manter operação atual");
    alts.push("Investir em automação de alertas e relatórios");
  }
  resp.alternativas = alts.map((a, i) => `${i + 1}. ${a}`).join("\n");

  // ── 12. RISCO PRINCIPAL ──
  if (ctx.belowMinimum.length >= 3) {
    resp.risco_principal = `🔴 Ruptura de estoque em ${ctx.belowMinimum.length} produtos simultaneamente. Impacto: perda de vendas, insatisfação e possível migração de clientes para concorrentes.`;
  } else if (ctx.lossRate > 10) {
    resp.risco_principal = `🔴 Taxa de perda em ${ctx.lossRate}% — corrosão direta da margem. Se mantida, pode comprometer a viabilidade financeira da operação.`;
  } else if (ctx.divergences.length >= 5) {
    resp.risco_principal = `🟡 ${ctx.divergences.length} divergências indicam possível falha sistêmica no controle de estoque. Risco de dados não confiáveis para decisões.`;
  } else if (ctx.pendingApprovals >= 5) {
    resp.risco_principal = `🟡 Gargalo de aprovações (${ctx.pendingApprovals} pendentes) pode travar a operação e gerar atrasos.`;
  } else {
    resp.risco_principal = "🟢 Sem riscos críticos identificados no momento. Monitorar indicadores diariamente para detecção precoce.";
  }

  // ── 13. O QUE FALTA SABER ──
  const missing: string[] = [];
  if (ctx.dataCompleteness !== "alta") missing.push("Configuração completa de estoque mínimo e ideal para todos os produtos");
  missing.push("Dados de vendas por produto (demanda real do dia)");
  missing.push("Custo unitário dos produtos (para calcular impacto financeiro das perdas em R$)");
  missing.push("Histórico de produção e perdas (para identificar tendências)");
  if (ctx.divergences.length > 0) missing.push("Histórico de divergências (para diferenciar erro pontual de problema recorrente)");
  resp.falta_saber = missing.map((m) => `❓ ${m}`).join("\n");

  // ── 14. PRÓXIMO PASSO ──
  const steps: string[] = [];
  if (ctx.belowMinimum.length > 0) steps.push(`Abrir a tela de Produção do Dia e registrar lotes para os ${ctx.belowMinimum.length} produto(s) críticos`);
  if (ctx.pendingApprovals > 0) steps.push(`Acessar Aprovações e processar as ${ctx.pendingApprovals} solicitação(ões) pendente(s)`);
  if (ctx.divergences.length > 0) steps.push("Revisar divergências no Estoque da Loja e recontagem dos itens com maior diferença");
  if (steps.length === 0) steps.push("Revisar o Resumo Operacional e planejar a produção de amanhã");
  resp.proximo_passo = steps.map((s, i) => `${i + 1}. ${s}`).join("\n");

  // ── 15. NÍVEL DE CONFIANÇA ──
  resp.nivel_confianca = CONFIDENCE_LABELS[ctx.dataCompleteness] +
    "\n\nFatores considerados: estoque, produção, perdas, degustações, divergências, aprovações e programações." +
    "\nFatores NÃO disponíveis: vendas, receita, custos, margens e dados financeiros do DRE.";

  return resp;
}
