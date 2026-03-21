/** Council member definitions, debate engine, and data-driven analysis */

import type { CouncilContextData, CashFlowAnalysis } from "@/hooks/use-council-context";
import type { DreResult } from "@/hooks/use-dre-data";

export interface CouncilMember {
  id: string;
  name: string;
  role: string;
  title: string;
  description: string;
  avatar: string;
  color: string;
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
    color: "hsl(var(--primary))",
    isHuman: true,
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    role: "CEO Auxiliar",
    title: "Chief of Staff IA",
    description: "Consolida análises, organiza prioridades, mostra conflitos e sugere caminhos.",
    avatar: "🧠",
    color: "#10a37f",
    isHuman: false,
  },
  {
    id: "claude",
    name: "Claude",
    role: "CFO de IA",
    title: "CFO IA",
    description: "Análise financeira, fluxo de caixa, DRE, margem, cenários e risco econômico.",
    avatar: "📊",
    color: "#d97706",
    isHuman: false,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    role: "CMO de IA",
    title: "CMO IA",
    description: "Marketing estratégico, tendências, concorrência e oportunidades.",
    avatar: "🎯",
    color: "#2563eb",
    isHuman: false,
  },
  {
    id: "grok",
    name: "Grok",
    role: "CIO / Contrarian",
    title: "CIO Contrarian IA",
    description: "Contraponto crítico, alertas de risco, questionamento de conclusões frágeis.",
    avatar: "⚡",
    color: "#dc2626",
    isHuman: false,
  },
  {
    id: "manus",
    name: "Manus",
    role: "CTO / Executor",
    title: "CTO Executor IA",
    description: "Arquitetura, integrações, automações, fluxos técnicos e viabilidade.",
    avatar: "🔧",
    color: "#7c3aed",
    isHuman: false,
  },
];

export const AI_MEMBERS = COUNCIL_MEMBERS.filter((m) => !m.isHuman);

export function getMember(id: string): CouncilMember {
  return COUNCIL_MEMBERS.find((m) => m.id === id) ?? COUNCIL_MEMBERS[1];
}

// ────────────────────────────────────────────────
// MESSAGE TYPES
// ────────────────────────────────────────────────

export interface DebateSpeech {
  memberId: string;
  content: string;
  stance?: "concorda" | "diverge" | "neutro" | "alerta" | "sintetiza";
  referencedMember?: string;
}

export interface CouncilMessage {
  id: string;
  role: "user" | "debate";
  content: string;
  speeches?: DebateSpeech[];
  timestamp: Date;
  quickActions?: string[];
  mode: "quick" | "debate";
}

// ────────────────────────────────────────────────
// QUICK ACTIONS
// ────────────────────────────────────────────────

export const QUICK_ACTIONS = [
  "Claude, aprofunde o impacto financeiro",
  "Grok, critique essa estratégia",
  "Manus, isso é executável agora?",
  "Perplexity, qual oportunidade comercial?",
  "CEO Auxiliar, compare as opções",
  "Mostrar riscos",
] as const;

export const MEMBER_QUICK_ACTIONS: Record<string, string[]> = {
  chatgpt: ["CEO Auxiliar, resuma o debate", "CEO Auxiliar, compare as opções"],
  claude: ["Claude, aprofunde o impacto financeiro", "Claude, qual o pior cenário?"],
  perplexity: ["Perplexity, qual oportunidade comercial?", "Perplexity, como posicionar isso?"],
  grok: ["Grok, critique essa estratégia", "Grok, qual o contraponto?"],
  manus: ["Manus, isso é executável agora?", "Manus, sugira um plano prático"],
};

// ────────────────────────────────────────────────
// FORMAT HELPERS
// ────────────────────────────────────────────────

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CONFIDENCE_LABELS: Record<string, string> = {
  alta: "🟢 Alta confiança",
  media: "🟡 Média confiança — dados parciais",
  baixa: "🟠 Baixa confiança — poucos dados",
  insuficiente: "🔴 Dados insuficientes",
};

// ────────────────────────────────────────────────
// SEVERITY ASSESSMENT (operational + financial)
// ────────────────────────────────────────────────

interface Severity {
  level: "critico" | "alerta" | "atencao" | "normal";
  reasons: string[];
}

function assessSeverity(ctx: CouncilContextData): Severity {
  const reasons: string[] = [];
  let level: Severity["level"] = "normal";

  // Cash flow assessment (highest priority)
  const cf = ctx.cashFlow;
  if (cf.alertLevel === "critico") {
    level = "critico";
    reasons.push(`Caixa NÃO cobre compromissos — déficit de ${fmtBRL(Math.abs(cf.folgaOuDeficit))}`);
  } else if (cf.alertLevel === "alerta") {
    if (level === "normal") level = "alerta";
    reasons.push(`Caixa apertado — folga de apenas ${fmtBRL(cf.folgaOuDeficit)}`);
  } else if (cf.alertLevel === "atencao") {
    if (level === "normal") level = "atencao";
    reasons.push(`Caixa com folga baixa — ${fmtBRL(cf.folgaOuDeficit)} de margem`);
  }

  if (cf.totalVencidas > 0) {
    if (level === "normal") level = "alerta";
    reasons.push(`${cf.contasVencidas.length} conta(s) vencida(s) — ${fmtBRL(cf.totalVencidas)}`);
  }

  // Operational
  if (ctx.belowMinimum.length >= 5) { level = "critico"; reasons.push(`${ctx.belowMinimum.length} produtos abaixo do estoque mínimo`); }
  else if (ctx.belowMinimum.length > 0) { if (level === "normal") level = "alerta"; reasons.push(`${ctx.belowMinimum.length} produto(s) abaixo do mínimo`); }

  if (ctx.lossRate > 10) { level = "critico"; reasons.push(`Taxa de perda de ${ctx.lossRate}% (acima de 10%)`); }
  else if (ctx.lossRate > 5) { if (level === "normal") level = "alerta"; reasons.push(`Taxa de perda de ${ctx.lossRate}% (acima de 5%)`); }

  if (ctx.divergences.length >= 5) { if (level === "normal") level = "alerta"; reasons.push(`${ctx.divergences.length} divergências na contagem`); }
  else if (ctx.divergences.length > 0) { if (level === "normal") level = "atencao"; reasons.push(`${ctx.divergences.length} divergência(s) na contagem`); }

  if (ctx.pendingApprovals >= 5) { if (level === "normal") level = "alerta"; reasons.push(`${ctx.pendingApprovals} aprovações pendentes`); }
  else if (ctx.pendingApprovals > 0) { if (level === "normal") level = "atencao"; reasons.push(`${ctx.pendingApprovals} aprovação(ões) pendente(s)`); }

  if (ctx.productionEfficiency < 50 && ctx.totalProducts > 0) { if (level === "normal") level = "alerta"; reasons.push(`Eficiência de estoque em ${ctx.productionEfficiency}%`); }

  // DRE assessment
  const dre = ctx.dre;
  if (dre && dre.receitaTotal > 0) {
    const margemBrutaPct = (dre.margemBruta / dre.receitaTotal) * 100;
    const ebitdaPct = (dre.ebitda / dre.receitaTotal) * 100;
    if (dre.lucroLiquido < 0) { level = "critico"; reasons.push(`Lucro líquido negativo: ${fmtBRL(dre.lucroLiquido)}`); }
    else if (ebitdaPct < 5) { if (level === "normal") level = "alerta"; reasons.push(`EBITDA apertado: ${ebitdaPct.toFixed(1)}% da receita`); }
    if (margemBrutaPct < 40) { if (level === "normal") level = "atencao"; reasons.push(`Margem bruta pressionada: ${margemBrutaPct.toFixed(1)}%`); }
    const cpvPct = (dre.cpv.total / dre.receitaTotal) * 100;
    if (cpvPct > 50) { if (level === "normal") level = "alerta"; reasons.push(`CPV alto: ${cpvPct.toFixed(1)}% da receita`); }
  }

  if (reasons.length === 0) reasons.push("Operação dentro dos parâmetros normais");
  return { level, reasons };
}

// ────────────────────────────────────────────────
// DETECT MODE & MEMBER
// ────────────────────────────────────────────────

const QUICK_TRIGGERS = ["rápido", "rapido", "curto", "resumido", "sim ou não", "sim ou nao"];

function detectMode(question: string): "quick" | "debate" {
  const q = question.toLowerCase();
  if (QUICK_TRIGGERS.some((t) => q.includes(t))) return "quick";
  return "debate";
}

function detectTargetMember(question: string): string | null {
  const q = question.toLowerCase();
  if (q.includes("claude") || q.includes("cfo")) return "claude";
  if (q.includes("perplexity") || q.includes("cmo")) return "perplexity";
  if (q.includes("grok") || q.includes("cio") || q.includes("contrarian")) return "grok";
  if (q.includes("manus") || q.includes("cto") || q.includes("executor")) return "manus";
  if (q.includes("ceo auxiliar") || q.includes("chatgpt") || q.includes("chief of staff")) return "chatgpt";
  return null;
}

function isCashRelatedQuestion(question: string): boolean {
  const q = question.toLowerCase();
  const triggers = ["caixa", "financ", "pagar", "receber", "déficit", "deficit", "folga", "compromisso", "vencid", "pagamento", "dinheiro", "gasto", "despesa", "custo", "aperto", "dre", "margem", "lucro", "ebitda", "receita", "cpv", "resultado"];
  return triggers.some((t) => q.includes(t));
}

// ────────────────────────────────────────────────
// DRE ANALYSIS HELPERS
// ────────────────────────────────────────────────

function pctOf(val: number, total: number): number {
  return total ? (val / total) * 100 : 0;
}

function generateDreBlock(dre: DreResult): string {
  if (dre.receitaTotal === 0) return "";
  const lines: string[] = [];
  lines.push("📊 **DRE Gerencial do Período**\n");
  lines.push("| Indicador | Valor | % Receita |");
  lines.push("|---|---|---|");
  lines.push(`| Receita Operacional | ${fmtBRL(dre.receitasOp.total)} | ${pctOf(dre.receitasOp.total, dre.receitaTotal).toFixed(1)}% |`);
  if (dre.receitasNaoOp.total > 0) lines.push(`| Receita Não Operacional | ${fmtBRL(dre.receitasNaoOp.total)} | ${pctOf(dre.receitasNaoOp.total, dre.receitaTotal).toFixed(1)}% |`);
  lines.push(`| **Receita Total** | **${fmtBRL(dre.receitaTotal)}** | 100% |`);
  lines.push(`| (-) CPV | ${fmtBRL(dre.cpv.total)} | ${pctOf(dre.cpv.total, dre.receitaTotal).toFixed(1)}% |`);
  lines.push(`| **(=) Margem Bruta** | **${fmtBRL(dre.margemBruta)}** | **${pctOf(dre.margemBruta, dre.receitaTotal).toFixed(1)}%** |`);
  lines.push(`| (-) Despesas Variáveis | ${fmtBRL(dre.despesasVar.total)} | ${pctOf(dre.despesasVar.total, dre.receitaTotal).toFixed(1)}% |`);
  lines.push(`| **(=) Margem Contribuição** | **${fmtBRL(dre.margemContribuicao)}** | **${pctOf(dre.margemContribuicao, dre.receitaTotal).toFixed(1)}%** |`);
  lines.push(`| (-) Custos Fixos | ${fmtBRL(dre.custosFixos.total)} | ${pctOf(dre.custosFixos.total, dre.receitaTotal).toFixed(1)}% |`);
  lines.push(`| **(=) EBITDA** | **${fmtBRL(dre.ebitda)}** | **${pctOf(dre.ebitda, dre.receitaTotal).toFixed(1)}%** |`);
  lines.push(`| (-) Impostos | ${fmtBRL(dre.impostos.total)} | ${pctOf(dre.impostos.total, dre.receitaTotal).toFixed(1)}% |`);
  lines.push(`| **(=) Lucro Líquido** | **${fmtBRL(dre.lucroLiquido)}** | **${pctOf(dre.lucroLiquido, dre.receitaTotal).toFixed(1)}%** |`);
  return lines.join("\n");
}

function generateCFODreAnalysis(dre: DreResult): string {
  if (dre.receitaTotal === 0) return "";
  const lines: string[] = [];
  const mbPct = pctOf(dre.margemBruta, dre.receitaTotal);
  const mcPct = pctOf(dre.margemContribuicao, dre.receitaTotal);
  const ebitdaPct = pctOf(dre.ebitda, dre.receitaTotal);
  const cpvPct = pctOf(dre.cpv.total, dre.receitaTotal);
  const fixoPct = pctOf(dre.custosFixos.total, dre.receitaTotal);

  lines.push("\n**Análise do DRE Gerencial:**\n");

  // CPV
  if (cpvPct > 50) lines.push(`⚠️ **CPV em ${cpvPct.toFixed(1)}%** — acima de 50% da receita. Insumos e matéria-prima estão comprimindo a margem. Necessário renegociar com fornecedores ou revisar composição dos produtos.`);
  else if (cpvPct > 40) lines.push(`🟡 CPV em ${cpvPct.toFixed(1)}% — dentro do esperado, mas monitore. Qualquer aumento de preço de insumo vai pressionar.`);
  else lines.push(`🟢 CPV em ${cpvPct.toFixed(1)}% — saudável.`);

  // Margem bruta
  if (mbPct < 40) lines.push(`⚠️ **Margem bruta de ${mbPct.toFixed(1)}%** — pressionada. O negócio precisa melhorar eficiência de produção ou repricing.`);
  else if (mbPct < 55) lines.push(`🟡 Margem bruta de ${mbPct.toFixed(1)}% — razoável, mas há espaço para melhoria.`);
  else lines.push(`🟢 Margem bruta de ${mbPct.toFixed(1)}% — saudável.`);

  // Custos fixos
  if (fixoPct > 30) lines.push(`⚠️ **Custos fixos em ${fixoPct.toFixed(1)}%** — desproporcionais. A estrutura pode estar pesada demais para o faturamento atual.`);
  else if (fixoPct > 20) lines.push(`🟡 Custos fixos em ${fixoPct.toFixed(1)}% — controlados, mas merecem revisão.`);
  else lines.push(`🟢 Custos fixos em ${fixoPct.toFixed(1)}% — leve e eficiente.`);

  // EBITDA
  if (dre.ebitda < 0) lines.push(`🔴 **EBITDA negativo (${fmtBRL(dre.ebitda)}).** A operação está gerando prejuízo operacional. Urgente conter custos e/ou aumentar receita.`);
  else if (ebitdaPct < 5) lines.push(`⚠️ EBITDA de apenas ${ebitdaPct.toFixed(1)}% — muito apertado. Qualquer variação transforma o resultado em prejuízo.`);
  else if (ebitdaPct < 15) lines.push(`🟡 EBITDA de ${ebitdaPct.toFixed(1)}% — positivo, mas sem gordura.`);
  else lines.push(`🟢 EBITDA de ${ebitdaPct.toFixed(1)}% — resultado operacional sólido.`);

  // Lucro líquido
  if (dre.lucroLiquido < 0) lines.push(`\n🔴 **Lucro líquido negativo: ${fmtBRL(dre.lucroLiquido)}.** O negócio está queimando caixa.`);
  else lines.push(`\nLucro líquido: **${fmtBRL(dre.lucroLiquido)}** (${pctOf(dre.lucroLiquido, dre.receitaTotal).toFixed(1)}%).`);

  return lines.join("\n");
}

function generateGrokDreConfrontation(dre: DreResult): string {
  if (dre.receitaTotal === 0) return "";
  const lines: string[] = [];
  const mbPct = pctOf(dre.margemBruta, dre.receitaTotal);
  const ebitdaPct = pctOf(dre.ebitda, dre.receitaTotal);

  if (dre.receitaTotal > 0 && dre.lucroLiquido < 0) {
    lines.push("**O DRE mostra que estamos trabalhando para ter prejuízo.**\n");
    lines.push(`Faturamento de ${fmtBRL(dre.receitaTotal)} e o resultado é negativo. A operação está girando dinheiro, mas sobrando menos do que consome.`);
    lines.push("\n**Pergunta que ninguém quer fazer:** estamos crescendo para lucrar ou crescendo para gastar mais?");
  } else if (ebitdaPct < 10 && dre.receitaTotal > 0) {
    lines.push(`EBITDA de ${ebitdaPct.toFixed(1)}% é **perigosamente baixo**. Se qualquer custo subir 5%, vira prejuízo.`);
    lines.push(`\nCom margem bruta de ${mbPct.toFixed(1)}%, a questão é clara: ou reduzimos custos fixos, ou aumentamos preço, ou aumentamos volume sem aumentar custo.`);
    lines.push("\n**Não adianta faturar mais se o custo cresce junto.** Crescimento sem margem é ilusão.");
  } else if (mbPct < 45 && dre.receitaTotal > 0) {
    lines.push(`Margem bruta de ${mbPct.toFixed(1)}% — o CPV está comendo boa parte da receita. Antes de pensar em vender mais, temos que entender por que produzir custa tanto.`);
  }

  return lines.join("\n");
}

function generateCEODreSynthesis(dre: DreResult): string {
  if (dre.receitaTotal === 0) return "";
  const lines: string[] = [];
  const ebitdaPct = pctOf(dre.ebitda, dre.receitaTotal);

  if (dre.lucroLiquido < 0) {
    lines.push(`\n📊 **DRE: Resultado NEGATIVO** — lucro de ${fmtBRL(dre.lucroLiquido)}. Prioridade é reverter o resultado antes de investir em crescimento.`);
  } else if (ebitdaPct < 10) {
    lines.push(`\n📊 **DRE: Resultado apertado** — EBITDA de ${ebitdaPct.toFixed(1)}%. Manter atenção na relação entre custos e receita.`);
  } else {
    lines.push(`\n📊 **DRE: Resultado positivo** — EBITDA de ${ebitdaPct.toFixed(1)}%, lucro de ${fmtBRL(dre.lucroLiquido)}.`);
  }

  return lines.join("\n");
}

// ────────────────────────────────────────────────
// CASH ALERT BLOCK (used in debates)
// ────────────────────────────────────────────────

function generateCashAlertBlock(cf: CashFlowAnalysis): string {
  if (cf.alertLevel === "normal" && cf.totalCompromissos === 0) return "";

  const lines: string[] = [];
  const emoji = cf.alertLevel === "critico" ? "🔴" : cf.alertLevel === "alerta" ? "🟡" : cf.alertLevel === "atencao" ? "🟠" : "🟢";

  lines.push(`${emoji} **ALERTA DE CAIXA: ${cf.alertLevel.toUpperCase()}**\n`);
  lines.push(`| Indicador | Valor |`);
  lines.push(`|---|---|`);
  lines.push(`| Caixa disponível | **${fmtBRL(cf.caixaDisponivel)}** |`);
  if (cf.totalVencidas > 0) lines.push(`| Contas vencidas (${cf.contasVencidas.length}) | **${fmtBRL(cf.totalVencidas)}** |`);
  if (cf.totalProx2Dias > 0) lines.push(`| Próximos 2 dias (${cf.contasProx2Dias.length}) | **${fmtBRL(cf.totalProx2Dias)}** |`);
  if (cf.totalProx7Dias > 0) lines.push(`| Próximos 7 dias (${cf.contasProx7Dias.length}) | **${fmtBRL(cf.totalProx7Dias)}** |`);
  lines.push(`| **Total compromissos** | **${fmtBRL(cf.totalCompromissos)}** |`);
  lines.push(`| **${cf.folgaOuDeficit >= 0 ? "Folga" : "DÉFICIT"}** | **${fmtBRL(cf.folgaOuDeficit)}** |`);

  return lines.join("\n");
}

// ────────────────────────────────────────────────
// CFO CASH ANALYSIS (firm when needed)
// ────────────────────────────────────────────────

function generateCFOCashAnalysis(cf: CashFlowAnalysis): { content: string; stance: DebateSpeech["stance"] } {
  const lines: string[] = [];

  if (cf.alertLevel === "critico") {
    lines.push("**⛔ SITUAÇÃO CRÍTICA DE CAIXA. Preciso ser direto.**\n");
    lines.push(`O caixa disponível é de **${fmtBRL(cf.caixaDisponivel)}** e os compromissos próximos somam **${fmtBRL(cf.totalCompromissos)}**.`);
    lines.push(`\n**Estamos com déficit de ${fmtBRL(Math.abs(cf.folgaOuDeficit))}. O dinheiro NÃO cobre o que precisamos pagar.**\n`);

    if (cf.totalVencidas > 0) {
      lines.push(`🔴 **${cf.contasVencidas.length} conta(s) já vencida(s)** — total de ${fmtBRL(cf.totalVencidas)}:`);
      cf.contasVencidas.slice(0, 5).forEach((c) => {
        lines.push(`  • ${c.descricao}${c.fornecedor ? ` (${c.fornecedor})` : ""}: ${fmtBRL(c.valor)} — vencida em ${c.data_vencimento}`);
      });
    }

    lines.push("\n**Recomendações imediatas:**");
    lines.push("1. **CONGELAR** qualquer nova despesa não essencial — sem exceção");
    lines.push("2. **Priorizar** pagamento das contas que afetam operação (fornecedores críticos)");
    lines.push("3. **Renegociar** vencimentos das contas que permitem postergação");
    lines.push("4. **Buscar entrada rápida** — cobranças pendentes, antecipação de recebíveis");
    lines.push("5. **Reduzir produção** que consome caixa sem giro imediato");

    lines.push("\n**Não cabe continuar gastando normalmente.** A operação precisa entrar em modo de contenção até o caixa se equilibrar.");

    return { content: lines.join("\n"), stance: "alerta" };
  }

  if (cf.alertLevel === "alerta") {
    lines.push("**⚠️ Caixa apertado. Atenção redobrada.**\n");
    lines.push(`Caixa: **${fmtBRL(cf.caixaDisponivel)}** | Compromissos: **${fmtBRL(cf.totalCompromissos)}** | Folga: **${fmtBRL(cf.folgaOuDeficit)}**`);
    lines.push(`\nA folga é de apenas **${Math.round((cf.folgaOuDeficit / Math.max(cf.totalCompromissos, 1)) * 100)}%** sobre os compromissos. Qualquer imprevisto nos coloca em déficit.\n`);

    if (cf.totalVencidas > 0) {
      lines.push(`🔴 **${cf.contasVencidas.length} conta(s) vencida(s)** precisam ser tratadas hoje — ${fmtBRL(cf.totalVencidas)}.`);
    }

    lines.push("\n**Recomendações:**");
    lines.push("• Postergar gastos não essenciais por pelo menos 7 dias");
    lines.push("• Priorizar contas críticas de fornecedores de insumos");
    lines.push("• Intensificar esforço de vendas para reforçar o caixa");
    lines.push("• Rever se há recebíveis atrasados para cobrar");

    return { content: lines.join("\n"), stance: "alerta" };
  }

  if (cf.alertLevel === "atencao") {
    lines.push(`Caixa em **${fmtBRL(cf.caixaDisponivel)}** com **${fmtBRL(cf.totalCompromissos)}** em compromissos. Folga de **${fmtBRL(cf.folgaOuDeficit)}**.`);
    lines.push("\nSituação controlada, mas recomendo atenção: a margem é baixa. Evitar novos gastos discricionários esta semana.");
    return { content: lines.join("\n"), stance: "neutro" };
  }

  // Normal
  if (cf.totalCompromissos > 0) {
    lines.push(`Caixa saudável: **${fmtBRL(cf.caixaDisponivel)}** com folga de **${fmtBRL(cf.folgaOuDeficit)}** sobre compromissos de **${fmtBRL(cf.totalCompromissos)}**.`);
    lines.push("\nSem restrições financeiras no momento. Fluxo de caixa confortável.");
  } else {
    lines.push("Sem compromissos financeiros registrados nos próximos 7 dias.");
  }
  return { content: lines.join("\n"), stance: "concorda" };
}

// ────────────────────────────────────────────────
// GROK CASH CONFRONTATION
// ────────────────────────────────────────────────

function generateGrokCashConfrontation(cf: CashFlowAnalysis): string {
  if (cf.alertLevel === "normal") return "";

  const lines: string[] = [];

  if (cf.alertLevel === "critico") {
    lines.push("**Vou ser brutalmente honesto aqui.**\n");
    lines.push(`Estamos com **${fmtBRL(cf.caixaDisponivel)}** no caixa e **${fmtBRL(cf.totalCompromissos)}** em compromissos. Isso não é sustentável.`);
    lines.push(`\nSe continuarmos operando como se nada estivesse acontecendo, vamos entrar em inadimplência real. **Não dá pra fingir que o problema não existe.**`);
    lines.push(`\nPergunta incômoda: como chegamos aqui? Estamos gastando mais do que deveríamos? Produzindo sem giro? Aceitando custos que não cabem?`);
    lines.push(`\n**Cortar agora dói menos do que quebrar depois.**`);
  } else if (cf.alertLevel === "alerta") {
    lines.push("Preciso puxar a orelha aqui.\n");
    lines.push(`O caixa está apertado e a folga é mínima. Se surgir qualquer imprevisto — um fornecedor que cobra, uma manutenção urgente — a conta não fecha.`);
    lines.push(`\n**Não é hora de assumir novos gastos.** E se temos contas vencidas, cada dia de atraso deteriora relações comerciais.`);
  } else {
    lines.push("Folga baixa no caixa. Não é crítico, mas merece atenção. Já vi muita empresa relaxar nesse ponto e em 15 dias virar emergência.");
  }

  return lines.join("\n");
}

// ────────────────────────────────────────────────
// CEO CASH SYNTHESIS
// ────────────────────────────────────────────────

function generateCEOCashSynthesis(cf: CashFlowAnalysis): string {
  if (cf.alertLevel === "normal" && cf.totalCompromissos === 0) return "";

  const lines: string[] = [];

  if (cf.alertLevel === "critico") {
    lines.push("**🔴 RECOMENDAÇÃO EXECUTIVA — AÇÃO IMEDIATA NECESSÁRIA**\n");
    lines.push("**Situação:** Déficit de caixa projetado.");
    lines.push(`**Tamanho do problema:** ${fmtBRL(Math.abs(cf.folgaOuDeficit))} de déficit.`);
    lines.push(`**Gravidade:** CRÍTICA — risco de inadimplência.\n`);

    if (cf.contasVencidas.length > 0) {
      lines.push("**Contas que exigem prioridade:**");
      cf.contasVencidas.slice(0, 5).forEach((c) => {
        lines.push(`  → ${c.descricao}: ${fmtBRL(c.valor)} (vencida)`);
      });
    }

    lines.push("\n**Gastos que devem ser revistos imediatamente:**");
    lines.push("• Qualquer despesa discricionária");
    lines.push("• Compras de insumos que não são urgentes");
    lines.push("• Produção de itens sem demanda comprovada");

    lines.push("\n**Ação imediata:**");
    lines.push("1. Levantar todas as entradas previstas nos próximos 3 dias");
    lines.push("2. Listar contas por prioridade (operacional > administrativa)");
    lines.push("3. Contatar fornecedores para renegociar prazos");
    lines.push("4. Avaliar se há recebíveis para antecipar");

    lines.push("\n*Gustavo, essa situação exige decisão agora. O Conselho recomenda contenção total até o caixa se reequilibrar.*");
  } else if (cf.alertLevel === "alerta") {
    lines.push("**🟡 Caixa apertado — recomendo cautela**\n");
    lines.push(`Folga de apenas **${fmtBRL(cf.folgaOuDeficit)}**. Sugestão: frear gastos não essenciais e priorizar cobranças.`);
    lines.push("\n*Não é emergência, mas precisa de atenção imediata para não virar uma.*");
  }

  return lines.join("\n");
}

// ────────────────────────────────────────────────
// GENERATE QUICK RESPONSE
// ────────────────────────────────────────────────

function generateQuickResponse(ctx: CouncilContextData, question: string): CouncilMessage {
  const severity = assessSeverity(ctx);
  const cf = ctx.cashFlow;
  const emoji = severity.level === "critico" ? "🔴" : severity.level === "alerta" ? "🟡" : severity.level === "atencao" ? "🟠" : "🟢";

  const lines = [
    `${emoji} **${severity.level === "normal" ? "Operação estável" : "Atenção necessária"}**`,
    "",
    `Produzidos: **${ctx.todayProduced}** | Perdas: **${ctx.todayLosses}** (${ctx.lossRate}%) | Eficiência: **${ctx.productionEfficiency}%**`,
  ];

  // Cash summary in quick mode
  if (cf.totalCompromissos > 0 || cf.alertLevel !== "normal") {
    const cashEmoji = cf.alertLevel === "critico" ? "🔴" : cf.alertLevel === "alerta" ? "🟡" : cf.alertLevel === "atencao" ? "🟠" : "🟢";
    lines.push(`\n${cashEmoji} **Caixa:** ${fmtBRL(cf.caixaDisponivel)} | Compromissos: ${fmtBRL(cf.totalCompromissos)} | ${cf.folgaOuDeficit >= 0 ? "Folga" : "**DÉFICIT**"}: ${fmtBRL(cf.folgaOuDeficit)}`);
    if (cf.totalVencidas > 0) lines.push(`🔴 **${cf.contasVencidas.length} conta(s) vencida(s)** — ${fmtBRL(cf.totalVencidas)}`);
  }

  if (ctx.belowMinimum.length > 0) lines.push(`\n🔴 **${ctx.belowMinimum.length}** produto(s) abaixo do mínimo.`);
  if (ctx.divergences.length > 0) lines.push(`⚠️ **${ctx.divergences.length}** divergência(s).`);
  if (ctx.pendingApprovals > 0) lines.push(`🔔 **${ctx.pendingApprovals}** aprovação(ões) pendente(s).`);

  if (severity.level !== "normal") {
    if (cf.alertLevel === "critico") {
      lines.push("\n💡 **PRIORIDADE: Resolver déficit de caixa antes de tudo.**");
    } else {
      lines.push("\n💡 " + (ctx.belowMinimum.length > 0 ? "Priorizar produção dos itens críticos." : "Resolver pendências operacionais."));
    }
  }

  return {
    id: crypto.randomUUID(),
    role: "debate",
    content: "",
    speeches: [{ memberId: "chatgpt", content: lines.join("\n"), stance: cf.alertLevel === "critico" ? "alerta" : "neutro" }],
    timestamp: new Date(),
    quickActions: cf.alertLevel !== "normal"
      ? ["Claude, aprofunde o impacto financeiro", "Grok, critique essa estratégia", "CEO Auxiliar, resuma a situação de caixa"]
      : ["Grok, critique essa estratégia", "Claude, aprofunde o impacto financeiro", "Manus, sugira um plano prático"],
    mode: "quick",
  };
}

// ────────────────────────────────────────────────
// GENERATE MEMBER FOLLOW-UP
// ────────────────────────────────────────────────

function generateMemberFollowUp(ctx: CouncilContextData, memberId: string, question: string): CouncilMessage {
  const severity = assessSeverity(ctx);
  const cf = ctx.cashFlow;
  let content = "";
  let stance: DebateSpeech["stance"] = "neutro";
  const cashRelated = isCashRelatedQuestion(question);

  switch (memberId) {
    case "chatgpt": {
      const lines = ["Vou sintetizar o que sabemos:\n"];
      lines.push(`Status: **${severity.level.toUpperCase()}** — ${severity.reasons.join("; ")}.`);
      lines.push(`\nDados disponíveis: ${ctx.totalProducts} produtos, ${ctx.todayProduced} produzidos hoje, eficiência ${ctx.productionEfficiency}%.`);

      // Always include cash info
      const cashSynthesis = generateCEOCashSynthesis(cf);
      if (cashSynthesis) lines.push(`\n${cashSynthesis}`);
      else if (cf.totalCompromissos > 0) lines.push(`\nCaixa: ${fmtBRL(cf.caixaDisponivel)} | Compromissos: ${fmtBRL(cf.totalCompromissos)} | Folga: ${fmtBRL(cf.folgaOuDeficit)}`);

      // DRE synthesis
      if (ctx.dre) {
        const dreSynth = generateCEODreSynthesis(ctx.dre);
        if (dreSynth) lines.push(dreSynth);
      }

      if (ctx.belowMinimum.length > 0) lines.push(`\nPrioridade operacional: regularizar ${ctx.belowMinimum.length} produto(s) críticos.`);
      lines.push(`\n${CONFIDENCE_LABELS[ctx.dataCompleteness]}`);
      content = lines.join("\n");
      stance = cf.alertLevel === "critico" ? "alerta" : "sintetiza";
      break;
    }
    case "claude": {
      const cfoAnalysis = generateCFOCashAnalysis(cf);
      const lines = ["Analisando sob a ótica financeira:\n"];

      // Cash analysis first (priority)
      lines.push(cfoAnalysis.content);

      // DRE analysis
      if (ctx.dre) {
        const dreAnalysis = generateCFODreAnalysis(ctx.dre);
        if (dreAnalysis) lines.push(dreAnalysis);
      }

      // Then operational financial impacts
      if (ctx.todayLosses > 0) {
        lines.push(`\n**Perdas operacionais:** ${ctx.todayLosses} un (${ctx.lossRate}%). ${ctx.lossRate > 5 ? "⚠️ Acima do aceitável — corrói margem diretamente." : "Dentro do tolerável."}`);
      }
      if (ctx.overProduced.length > 0) {
        lines.push(`\n**Capital parado:** ${ctx.overProduced.length} produto(s) acima do ideal — caixa consumido sem giro.`);
        ctx.overProduced.slice(0, 3).forEach((p) => lines.push(`  • ${p.name}: +${Math.abs(p.gap)} un excedente`));
      }

      content = lines.join("\n");
      stance = cfoAnalysis.stance;
      break;
    }
    case "perplexity": {
      const lines = ["Do ponto de vista comercial e de mercado:\n"];
      if (cf.alertLevel === "critico" || cf.alertLevel === "alerta") {
        lines.push("**Concordo com Claude sobre a urgência financeira.** Do lado comercial, há formas de reforçar o caixa:\n");
        lines.push("• **Ações promocionais relâmpago** com itens de alto giro");
        lines.push("• **Combos especiais** para aumentar ticket médio");
        lines.push("• **Intensificar canal B2B** com entregas rápidas");
        if (ctx.overProduced.length > 0) {
          lines.push(`\n📦 Produtos com excesso podem virar promoção imediata:`);
          ctx.overProduced.slice(0, 3).forEach((p) => lines.push(`  • ${p.name}: +${Math.abs(p.gap)} un`));
        }
      } else {
        if (ctx.belowMinimum.length > 0) lines.push(`🎯 **Risco para o cliente:** ${ctx.belowMinimum.length} produto(s) podem faltar.`);
        if (ctx.overProduced.length > 0) {
          lines.push(`\n💡 **Oportunidade:** Excesso → promoção:`);
          ctx.overProduced.slice(0, 3).forEach((p) => lines.push(`  • ${p.name}: +${Math.abs(p.gap)} un`));
        }
        if (ctx.todayProduced > 0) lines.push(`\n📸 Produção de ${ctx.todayProduced} un = conteúdo para Instagram.`);
      }
      content = lines.join("\n");
      stance = cf.alertLevel !== "normal" ? "concorda" : "neutro";
      break;
    }
    case "grok": {
      const lines = ["Vou ser direto — preciso levantar pontos que talvez ninguém queira ouvir:\n"];

      // Cash confrontation first
      const cashConfrontation = generateGrokCashConfrontation(cf);
      if (cashConfrontation) {
        lines.push(cashConfrontation);
        lines.push("");
      }

      // DRE confrontation
      if (ctx.dre) {
        const dreConfront = generateGrokDreConfrontation(ctx.dre);
        if (dreConfront) {
          lines.push(dreConfront);
          lines.push("");
        }
      }

      // Operational
      if (ctx.divergences.length > 0) {
        const big = ctx.divergences.filter((d) => Math.abs(d.diff) >= 3);
        lines.push(`🔍 **${ctx.divergences.length} divergência(s) de contagem.** ${big.length > 0 ? `${big.length} com diferença ≥ 3 un — pode ser sistêmico.` : "Pequenas, mas recorrência importa."}`);
      }
      if (ctx.lossRate > 2) {
        lines.push(`\n📐 Perda em ${ctx.lossRate}% — ${ctx.lossRate > 5 ? "preocupante." : "tolerável, mas questiono se estamos normalizando."}`);
      }
      if (ctx.dataCompleteness !== "alta") {
        lines.push(`\n🔎 Completude "${ctx.dataCompleteness}" — decisões com dados incompletos.`);
      }
      if (!cashConfrontation && ctx.divergences.length === 0 && ctx.lossRate <= 2) {
        lines.push("Dados consistentes hoje. Sem contrapontos fortes.");
      }
      content = lines.join("\n");
      stance = cf.alertLevel !== "normal" || ctx.divergences.length > 0 ? "diverge" : "concorda";
      break;
    }
    case "manus": {
      const lines = ["Avaliando viabilidade prática:\n"];
      const steps: string[] = [];

      if (cf.alertLevel === "critico") {
        steps.push("Listar todas contas vencidas e próximas em uma planilha de prioridade");
        steps.push("Contatar fornecedores para renegociar top 3 maiores vencimentos");
        steps.push("Levantar recebíveis pendentes para cobrar hoje");
      }
      if (ctx.belowMinimum.length > 0) steps.push(`Produção emergencial dos ${ctx.belowMinimum.length} itens críticos`);
      if (ctx.pendingApprovals > 0) steps.push(`Processar ${ctx.pendingApprovals} aprovação(ões) pendente(s)`);
      if (ctx.divergences.length > 0) steps.push(`Recontagem dos ${ctx.divergences.length} itens divergentes`);

      if (steps.length > 0) {
        lines.push("**Ações executáveis agora:**");
        steps.forEach((s, i) => lines.push(`**${i + 1}.** ${s}`));
      } else {
        lines.push("✅ Operação fluindo. Sem ações urgentes.");
      }

      content = lines.join("\n");
      stance = "concorda";
      break;
    }
  }

  return {
    id: crypto.randomUUID(),
    role: "debate",
    content: "",
    speeches: [{ memberId, content, stance }],
    timestamp: new Date(),
    quickActions: Object.entries(MEMBER_QUICK_ACTIONS)
      .filter(([k]) => k !== memberId)
      .map(([, actions]) => actions[0])
      .slice(0, 4),
    mode: "debate",
  };
}

// ────────────────────────────────────────────────
// GENERATE FULL DEBATE
// ────────────────────────────────────────────────

function generateFullDebate(ctx: CouncilContextData, question: string): CouncilMessage {
  const severity = assessSeverity(ctx);
  const cf = ctx.cashFlow;
  const speeches: DebateSpeech[] = [];

  // 1. CEO Auxiliar opens
  {
    const lines = [`Vamos analisar a pergunta: **"${question}"**\n`];
    const emoji = severity.level === "critico" ? "🔴" : severity.level === "alerta" ? "🟡" : severity.level === "atencao" ? "🟠" : "🟢";
    lines.push(`${emoji} Status geral: **${severity.level.toUpperCase()}**`);
    lines.push(`\n**Dados do dia:** ${ctx.todayProduced} produzidos, ${ctx.todayLosses} perdas (${ctx.lossRate}%), ${ctx.todayTastings} degustações, eficiência ${ctx.productionEfficiency}%`);

    // Cash overview
    if (cf.totalCompromissos > 0 || cf.alertLevel !== "normal") {
      const cashBlock = generateCashAlertBlock(cf);
      if (cashBlock) lines.push(`\n${cashBlock}`);
    }

    // DRE overview
    if (ctx.dre && ctx.dre.receitaTotal > 0) {
      lines.push(`\n${generateDreBlock(ctx.dre)}`);
    }

    if (severity.reasons.length > 0) {
      lines.push("\n**Pontos de atenção:**");
      severity.reasons.forEach((r) => lines.push(`  → ${r}`));
    }
    lines.push("\nVou passar a palavra para cada conselheiro trazer sua perspectiva.");
    speeches.push({ memberId: "chatgpt", content: lines.join("\n"), stance: cf.alertLevel === "critico" ? "alerta" : "neutro" });
  }

  // 2. CFO — financial view (with cash analysis)
  {
    const cfoAnalysis = generateCFOCashAnalysis(cf);
    const lines: string[] = [cfoAnalysis.content];

    // Add operational financial impacts
    if (ctx.todayLosses > 0) {
      lines.push(`\n**Impacto operacional:** Perdas de **${ctx.todayLosses} un** (${ctx.lossRate}%) ${ctx.lossRate > 5 ? "— acima do aceitável, corrói margem diretamente." : "— dentro do tolerável."}`);
    }
    if (ctx.overProduced.length > 0) {
      lines.push(`\n**Capital parado** em ${ctx.overProduced.length} produto(s): ${ctx.overProduced.slice(0, 2).map((p) => `${p.name} (+${Math.abs(p.gap)})`).join(", ")}.`);
    }
    if (ctx.belowMinimum.length > 0) {
      lines.push(`\n**Risco de receita:** ${ctx.belowMinimum.length} produto(s) podem gerar ruptura.`);
    }
    lines.push(`\nEficiência geral: **${ctx.productionEfficiency}%**. ${ctx.productionEfficiency >= 80 ? "Bom nível." : ctx.productionEfficiency >= 50 ? "Há margem para melhoria." : "Nível preocupante."}`);

    speeches.push({
      memberId: "claude",
      content: lines.join("\n"),
      stance: cfoAnalysis.stance,
    });
  }

  // 3. CMO — market view (adjusted for cash crisis)
  {
    const lines: string[] = [];
    if (cf.alertLevel === "critico" || cf.alertLevel === "alerta") {
      lines.push(`Concordo com Claude — a situação financeira é prioritária. Do lado comercial, posso contribuir com **ações de receita rápida**:\n`);
      lines.push("• **Promoção relâmpago** para gerar entrada imediata");
      lines.push("• **Combos de alto giro** para maximizar ticket");
      if (ctx.overProduced.length > 0) {
        lines.push(`\n📦 **Produtos com excesso** → promoção imediata:`);
        ctx.overProduced.slice(0, 3).forEach((p) => lines.push(`  • ${p.name}: +${Math.abs(p.gap)} un → precificar para girar rápido`));
      }
      lines.push("\n**Foco: cada venda conta para reforçar o caixa agora.**");
    } else {
      if (ctx.belowMinimum.length > 0) {
        lines.push(`Concordo com Claude sobre o risco de ruptura. **${ctx.belowMinimum.length} produto(s) faltando** pode causar migração.`);
      }
      if (ctx.overProduced.length > 0) {
        lines.push(`\nVejo **oportunidade** no excesso:`);
        ctx.overProduced.slice(0, 3).forEach((p) => lines.push(`  • ${p.name}: +${Math.abs(p.gap)} un → combo ou promoção`));
      }
      if (ctx.todayProduced > 0) lines.push(`\nProdução de **${ctx.todayProduced} un** = conteúdo para engajamento.`);
      if (ctx.overProduced.length === 0 && ctx.belowMinimum.length === 0) lines.push("Mix equilibrado. Bom momento para conteúdo de marca.");
    }
    speeches.push({
      memberId: "perplexity",
      content: lines.join("\n"),
      stance: cf.alertLevel !== "normal" ? "concorda" : ctx.belowMinimum.length > 0 ? "concorda" : "neutro",
      referencedMember: "claude",
    });
  }

  // 4. CIO / Contrarian (firm on cash issues)
  {
    const lines: string[] = [];
    lines.push("Preciso levantar alguns pontos que podem estar passando despercebidos:\n");
    let hasContention = false;

    // Cash confrontation
    const cashConfrontation = generateGrokCashConfrontation(cf);
    if (cashConfrontation) {
      lines.push(cashConfrontation);
      hasContention = true;
    }

    if (ctx.divergences.length > 0) {
      const big = ctx.divergences.filter((d) => Math.abs(d.diff) >= 3);
      lines.push(`\n**${ctx.divergences.length} divergência(s) de contagem.** ${big.length > 0 ? `${big.length} com diferença ≥ 3 un — pode ser problema de processo.` : "Pequenas, mas a recorrência importa."}`);
      hasContention = true;
    }

    if (ctx.overProduced.length > 0 && cf.alertLevel !== "normal") {
      lines.push(`\n**Discordo de quem quer promoção.** Se o caixa está apertado e estamos produzindo a mais, o problema é de planejamento. Promoção mascara o erro.`);
      hasContention = true;
    } else if (ctx.overProduced.length > 0) {
      lines.push(`\n**Discordo parcialmente de Perplexity.** Antes de promoção, entender *por que* produzimos a mais.`);
      hasContention = true;
    }

    if (ctx.lossRate > 2) {
      lines.push(`\nPerda de ${ctx.lossRate}% — ${ctx.lossRate > 5 ? "preocupante. Auditoria necessária." : "tolerável, mas não ideal."}`);
      hasContention = true;
    }

    if (ctx.dataCompleteness !== "alta") {
      lines.push(`\n🔎 Completude "${ctx.dataCompleteness}" — decisões com dados incompletos.`);
      hasContention = true;
    }

    if (!hasContention) lines.push("Dados consistentes. Sem contrapontos fortes hoje.");

    speeches.push({
      memberId: "grok",
      content: lines.join("\n"),
      stance: hasContention ? "diverge" : "concorda",
      referencedMember: ctx.overProduced.length > 0 ? "perplexity" : undefined,
    });
  }

  // 5. CTO / Executor
  {
    const lines: string[] = [];
    const steps: string[] = [];

    // Cash-specific actions
    if (cf.alertLevel === "critico") {
      lines.push("**Plano de ação emergencial para caixa:**\n");
      steps.push("Exportar lista de todas contas vencidas e próximas, ordenar por impacto");
      steps.push("Contatar os 3 maiores credores para renegociar prazo");
      steps.push("Levantar recebíveis atrasados e cobrar imediatamente");
      steps.push("Congelar compras de insumos não essenciais por 7 dias");
      if (ctx.overProduced.length > 0) steps.push("Pausar produção de itens com excesso de estoque");
    } else if (cf.alertLevel === "alerta") {
      steps.push("Montar planilha de priorização de pagamentos da semana");
      steps.push("Identificar recebíveis pendentes para cobrança");
    }

    if (ctx.belowMinimum.length > 0) steps.push(`Produção emergencial dos ${ctx.belowMinimum.length} itens críticos`);
    if (ctx.pendingApprovals > 0) steps.push(`Processar ${ctx.pendingApprovals} aprovação(ões)`);
    if (ctx.divergences.length > 0) steps.push(`Recontagem dos ${ctx.divergences.length} itens divergentes`);

    if (steps.length > 0) {
      if (cf.alertLevel !== "critico") lines.push("Concordo com os pontos levantados. Vamos ao que é executável **agora**:\n");
      steps.forEach((s, i) => lines.push(`**${i + 1}.** ${s}`));
    } else {
      lines.push("✅ Operação fluindo. Sem ações urgentes.");
    }

    speeches.push({
      memberId: "manus",
      content: lines.join("\n"),
      stance: cf.alertLevel === "critico" ? "alerta" : "concorda",
      referencedMember: ctx.divergences.length > 0 ? "grok" : undefined,
    });
  }

  // 6. CEO Auxiliar closes — synthesis
  {
    const lines = ["**Síntese do debate:**\n"];

    // Cash synthesis first if relevant
    const cashSynthesis = generateCEOCashSynthesis(cf);
    if (cashSynthesis) {
      lines.push(cashSynthesis);
      lines.push("");
    }

    // Convergences
    const conv: string[] = [];
    if (cf.alertLevel !== "normal") conv.push("necessidade de controle de caixa");
    if (ctx.belowMinimum.length > 0) conv.push("risco de ruptura como prioridade");
    if (ctx.lossRate > 5) conv.push("necessidade de reduzir perdas");
    if (ctx.divergences.length > 0) conv.push("investigar divergências");
    if (conv.length > 0) lines.push(`✅ **Convergências:** ${conv.join(", ")}.`);

    // Divergences
    const div: string[] = [];
    if (ctx.overProduced.length > 0 && cf.alertLevel !== "normal") div.push("CMO quer promoção, Grok questiona se mascara problema de planejamento");
    else if (ctx.overProduced.length > 0) div.push("CMO quer promoção, Grok questiona a causa raiz");
    if (div.length > 0) lines.push(`⚔️ **Divergências:** ${div.join("; ")}.`);

    // Main suggestion
    if (cf.alertLevel === "critico") {
      lines.push("\n💡 **Sugestão principal:** Entrar em modo de contenção financeira. Congelar gastos, renegociar vencimentos, buscar entradas rápidas.");
    } else if (cf.alertLevel === "alerta") {
      lines.push("\n💡 **Sugestão principal:** Controlar gastos esta semana e priorizar cobranças de recebíveis.");
    } else if (severity.level === "critico" || severity.level === "alerta") {
      const topAction = ctx.belowMinimum.length > 0
        ? `regularizar estoque dos ${ctx.belowMinimum.length} produto(s) críticos`
        : ctx.divergences.length > 0
          ? `investigar ${ctx.divergences.length} divergência(s)`
          : "resolver pendências operacionais";
      lines.push(`\n💡 **Sugestão principal:** ${topAction}.`);
    } else {
      lines.push("\n💡 **Sugestão:** Manter monitoramento. Operação estável.");
    }

    // Risk
    if (cf.alertLevel === "critico") lines.push(`\n⚠️ **Risco principal:** Inadimplência — déficit de ${fmtBRL(Math.abs(cf.folgaOuDeficit))}.`);
    else if (cf.totalVencidas > 0) lines.push(`\n⚠️ **Risco:** ${cf.contasVencidas.length} conta(s) vencida(s) acumulando.`);
    else if (ctx.belowMinimum.length >= 3) lines.push(`\n⚠️ **Risco:** Ruptura em ${ctx.belowMinimum.length} produtos simultaneamente.`);
    else if (ctx.lossRate > 5) lines.push(`\n⚠️ **Risco:** Perda de ${ctx.lossRate}% corroendo margem.`);

    // Missing data
    const missing: string[] = [];
    if (ctx.dataCompleteness !== "alta") missing.push("configuração completa de produtos");
    missing.push("dados de vendas e custos unitários");
    lines.push(`\n❓ **Falta saber:** ${missing.join(", ")}.`);

    lines.push(`\n${CONFIDENCE_LABELS[ctx.dataCompleteness]}`);
    lines.push("\n*A decisão final é sempre sua, Gustavo.*");

    speeches.push({ memberId: "chatgpt", content: lines.join("\n"), stance: "sintetiza" });
  }

  return {
    id: crypto.randomUUID(),
    role: "debate",
    content: "",
    speeches,
    timestamp: new Date(),
    quickActions: cf.alertLevel !== "normal"
      ? [
          "Claude, qual o pior cenário?",
          "Manus, sugira um plano prático",
          "Grok, critique essa estratégia",
          "Perplexity, como reforçar receita?",
        ]
      : [
          "Claude, aprofunde o impacto financeiro",
          "Grok, critique essa estratégia",
          "Manus, isso é executável agora?",
          "CEO Auxiliar, resuma o debate",
        ],
    mode: "debate",
  };
}

// ────────────────────────────────────────────────
// MAIN EXPORT
// ────────────────────────────────────────────────

export function generateCouncilResponse(
  ctx: CouncilContextData,
  question: string,
  _history: CouncilMessage[],
): CouncilMessage {
  const targetMember = detectTargetMember(question);
  if (targetMember) {
    return generateMemberFollowUp(ctx, targetMember, question);
  }

  const mode = detectMode(question);
  if (mode === "quick") {
    return generateQuickResponse(ctx, question);
  }

  return generateFullDebate(ctx, question);
}
