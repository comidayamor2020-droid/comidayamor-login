/** Council member definitions and response structure — ready for future AI integration */

export interface CouncilMember {
  id: string;
  name: string;
  role: string;
  title: string;
  description: string;
  avatar: string; // emoji for V1
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

export interface CouncilResponseSection {
  key: string;
  label: string;
  content: string;
}

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

/** Build operational context string from system data — used as input for council analysis */
export function buildContextSummary(data: {
  totalProducts: number;
  belowMinimum: { name: string; current: number; minimum: number }[];
  todayProduced: number;
  todayLosses: number;
  todayTastings: number;
  divergences: number;
  pendingApprovals: number;
  activeScheduled: { name: string; deadline: string }[];
}): string {
  const lines: string[] = [];
  const today = new Date().toLocaleDateString("pt-BR");
  lines.push(`📅 Data: ${today}`);
  lines.push(`📦 Produtos ativos: ${data.totalProducts}`);
  lines.push(`✅ Produzido hoje: ${data.todayProduced} unidades`);
  lines.push(`❌ Perdas hoje: ${data.todayLosses} unidades`);
  lines.push(`🍽️ Degustações hoje: ${data.todayTastings} unidades`);
  lines.push(`⚠️ Divergências na contagem: ${data.divergences}`);
  lines.push(`🔔 Aprovações pendentes: ${data.pendingApprovals}`);

  if (data.belowMinimum.length > 0) {
    lines.push(`\n🔴 Produtos abaixo do mínimo (${data.belowMinimum.length}):`);
    data.belowMinimum.forEach((p) => {
      lines.push(`  • ${p.name}: ${p.current} / ${p.minimum}`);
    });
  } else {
    lines.push(`\n✅ Nenhum produto abaixo do estoque mínimo.`);
  }

  if (data.activeScheduled.length > 0) {
    lines.push(`\n📋 Programações ativas (${data.activeScheduled.length}):`);
    data.activeScheduled.slice(0, 5).forEach((s) => {
      lines.push(`  • ${s.name} — prazo: ${s.deadline}`);
    });
  }

  return lines.join("\n");
}

/**
 * V1: Generate a simulated council response based on internal data.
 * Future: Each section will be filled by the corresponding AI agent.
 */
export function generateV1Response(context: string, question: string): CouncilResponse {
  const resp: CouncilResponse = {};

  resp.leitura_executiva =
    "Com base nos dados operacionais disponíveis, o conselho analisou o estado atual do negócio. " +
    "A análise considera estoque, produção, perdas, divergências e programações ativas.";

  resp.atencao =
    context.includes("abaixo do mínimo")
      ? "Existem produtos abaixo do estoque mínimo que precisam de atenção imediata para evitar ruptura."
      : "Operação dentro dos parâmetros. Manter monitoramento contínuo.";

  resp.visao_ceo_auxiliar =
    `Pergunta recebida: "${question}"\n\n` +
    "Recomendo priorizar os itens com maior impacto no faturamento e na experiência do cliente. " +
    "As áreas de estoque e produção estão interligadas — divergências indicam necessidade de alinhamento.";

  resp.visao_cfo =
    "Do ponto de vista financeiro, perdas representam custo direto. " +
    "Recomendo acompanhar o índice de perda/produção diário e estabelecer metas de redução.";

  resp.visao_cmo =
    "Produtos com alta demanda e baixo estoque representam oportunidade perdida. " +
    "Considerar campanhas promocionais para produtos com estoque acima do ideal.";

  resp.visao_cio =
    "Questiono se os dados de contagem estão sendo coletados com frequência suficiente. " +
    "Divergências recorrentes podem indicar falha de processo, não apenas de contagem.";

  resp.visao_cto =
    "A arquitetura atual suporta a coleta de dados operacionais. " +
    "Para evolução, recomendo integrar alertas automáticos quando estoque atingir nível crítico.";

  resp.convergencias =
    "Todos concordam que o monitoramento de estoque é prioridade e que perdas precisam ser reduzidas.";

  resp.divergencias =
    "CMO sugere ações comerciais enquanto CFO prioriza redução de custos. " +
    "Ambas as visões são válidas e complementares.";

  resp.sugestao_principal =
    "Focar na regularização dos produtos abaixo do mínimo e revisar o processo de contagem para reduzir divergências.";

  resp.alternativas =
    "1. Aumentar frequência de produção dos itens críticos.\n" +
    "2. Ajustar estoque mínimo com base na demanda real.\n" +
    "3. Implementar contagem dupla para produtos de alto valor.";

  resp.risco_principal =
    "Ruptura de estoque em produtos chave, resultando em perda de vendas e insatisfação do cliente.";

  resp.falta_saber =
    "Dados de vendas por produto (demanda real), custo das perdas em R$, e histórico de produção semanal.";

  resp.proximo_passo =
    "Revisar os produtos abaixo do mínimo, priorizar produção e alinhar equipe operacional.";

  resp.nivel_confianca =
    "Média — análise baseada apenas em dados operacionais internos. " +
    "Confiança aumentará com integração de dados financeiros e de vendas.";

  return resp;
}
