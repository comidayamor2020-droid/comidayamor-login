/** Council member definitions, debate engine, and data-driven analysis */

import type { CouncilContextData } from "@/hooks/use-council-context";

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
  referencedMember?: string; // member id they reference
}

export interface CouncilMessage {
  id: string;
  role: "user" | "debate";
  content: string; // plain text for user messages, ignored for debate
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
// SEVERITY ASSESSMENT
// ────────────────────────────────────────────────

interface Severity {
  level: "critico" | "alerta" | "atencao" | "normal";
  reasons: string[];
}

function assessSeverity(ctx: CouncilContextData): Severity {
  const reasons: string[] = [];
  let level: Severity["level"] = "normal";

  if (ctx.belowMinimum.length >= 5) { level = "critico"; reasons.push(`${ctx.belowMinimum.length} produtos abaixo do estoque mínimo`); }
  else if (ctx.belowMinimum.length > 0) { if (level === "normal") level = "alerta"; reasons.push(`${ctx.belowMinimum.length} produto(s) abaixo do mínimo`); }

  if (ctx.lossRate > 10) { level = "critico"; reasons.push(`Taxa de perda de ${ctx.lossRate}% (acima de 10%)`); }
  else if (ctx.lossRate > 5) { if (level === "normal") level = "alerta"; reasons.push(`Taxa de perda de ${ctx.lossRate}% (acima de 5%)`); }

  if (ctx.divergences.length >= 5) { if (level === "normal") level = "alerta"; reasons.push(`${ctx.divergences.length} divergências na contagem`); }
  else if (ctx.divergences.length > 0) { if (level === "normal") level = "atencao"; reasons.push(`${ctx.divergences.length} divergência(s) na contagem`); }

  if (ctx.pendingApprovals >= 5) { if (level === "normal") level = "alerta"; reasons.push(`${ctx.pendingApprovals} aprovações pendentes`); }
  else if (ctx.pendingApprovals > 0) { if (level === "normal") level = "atencao"; reasons.push(`${ctx.pendingApprovals} aprovação(ões) pendente(s)`); }

  if (ctx.productionEfficiency < 50 && ctx.totalProducts > 0) { if (level === "normal") level = "alerta"; reasons.push(`Eficiência de estoque em ${ctx.productionEfficiency}%`); }

  if (reasons.length === 0) reasons.push("Operação dentro dos parâmetros normais");
  return { level, reasons };
}

// ────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────

function listItems(items: string[], max = 5): string {
  const shown = items.slice(0, max);
  const rest = items.length - max;
  const lines = shown.map((i) => `• ${i}`).join("\n");
  return rest > 0 ? `${lines}\n  ...e mais ${rest} item(ns).` : lines;
}

const CONFIDENCE_LABELS: Record<string, string> = {
  alta: "🟢 Alta confiança",
  media: "🟡 Média confiança — dados parciais",
  baixa: "🟠 Baixa confiança — poucos dados",
  insuficiente: "🔴 Dados insuficientes",
};

// ────────────────────────────────────────────────
// DETECT MODE
// ────────────────────────────────────────────────

const QUICK_TRIGGERS = ["rápido", "rapido", "curto", "resumido", "sim ou não", "sim ou nao"];

function detectMode(question: string): "quick" | "debate" {
  const q = question.toLowerCase();
  if (QUICK_TRIGGERS.some((t) => q.includes(t))) return "quick";
  return "debate";
}

// ────────────────────────────────────────────────
// DETECT MEMBER-DIRECTED QUESTIONS
// ────────────────────────────────────────────────

function detectTargetMember(question: string): string | null {
  const q = question.toLowerCase();
  if (q.includes("claude") || q.includes("cfo")) return "claude";
  if (q.includes("perplexity") || q.includes("cmo")) return "perplexity";
  if (q.includes("grok") || q.includes("cio") || q.includes("contrarian")) return "grok";
  if (q.includes("manus") || q.includes("cto") || q.includes("executor")) return "manus";
  if (q.includes("ceo auxiliar") || q.includes("chatgpt") || q.includes("chief of staff")) return "chatgpt";
  return null;
}

// ────────────────────────────────────────────────
// GENERATE QUICK RESPONSE
// ────────────────────────────────────────────────

function generateQuickResponse(ctx: CouncilContextData, question: string): CouncilMessage {
  const severity = assessSeverity(ctx);
  const emoji = severity.level === "critico" ? "🔴" : severity.level === "alerta" ? "🟡" : severity.level === "atencao" ? "🟠" : "🟢";

  const lines = [
    `${emoji} **${severity.level === "normal" ? "Operação estável" : "Atenção necessária"}**`,
    "",
    `Produzidos: **${ctx.todayProduced}** | Perdas: **${ctx.todayLosses}** (${ctx.lossRate}%) | Eficiência: **${ctx.productionEfficiency}%**`,
  ];

  if (ctx.belowMinimum.length > 0) lines.push(`\n🔴 **${ctx.belowMinimum.length}** produto(s) abaixo do mínimo.`);
  if (ctx.divergences.length > 0) lines.push(`⚠️ **${ctx.divergences.length}** divergência(s).`);
  if (ctx.pendingApprovals > 0) lines.push(`🔔 **${ctx.pendingApprovals}** aprovação(ões) pendente(s).`);

  if (severity.level !== "normal") {
    lines.push("\n💡 " + (ctx.belowMinimum.length > 0 ? "Priorizar produção dos itens críticos." : "Resolver pendências operacionais."));
  }

  return {
    id: crypto.randomUUID(),
    role: "debate",
    content: "",
    speeches: [{ memberId: "chatgpt", content: lines.join("\n"), stance: "neutro" }],
    timestamp: new Date(),
    quickActions: ["Grok, critique essa estratégia", "Claude, aprofunde o impacto financeiro", "Manus, sugira um plano prático"],
    mode: "quick",
  };
}

// ────────────────────────────────────────────────
// GENERATE SINGLE-MEMBER FOLLOW-UP
// ────────────────────────────────────────────────

function generateMemberFollowUp(ctx: CouncilContextData, memberId: string, question: string): CouncilMessage {
  const severity = assessSeverity(ctx);
  let content = "";
  let stance: DebateSpeech["stance"] = "neutro";

  switch (memberId) {
    case "chatgpt": {
      const lines = ["Vou sintetizar o que sabemos:\n"];
      lines.push(`Status: **${severity.level.toUpperCase()}** — ${severity.reasons.join("; ")}.`);
      lines.push(`\nDados disponíveis: ${ctx.totalProducts} produtos, ${ctx.todayProduced} produzidos hoje, eficiência ${ctx.productionEfficiency}%.`);
      if (ctx.belowMinimum.length > 0) lines.push(`\nPrioridade: regularizar ${ctx.belowMinimum.length} produto(s) críticos.`);
      lines.push(`\n${CONFIDENCE_LABELS[ctx.dataCompleteness]}`);
      content = lines.join("\n");
      stance = "sintetiza";
      break;
    }
    case "claude": {
      const lines = ["Analisando sob a ótica financeira:\n"];
      if (ctx.todayLosses > 0) {
        lines.push(`Perdas hoje: **${ctx.todayLosses}** un (${ctx.lossRate}%). ${ctx.lossRate > 5 ? "⚠️ Acima do aceitável — corrói margem diretamente." : "Dentro do tolerável, mas monitorar."}`);
      }
      if (ctx.overProduced.length > 0) {
        lines.push(`\n**Capital parado:** ${ctx.overProduced.length} produto(s) acima do ideal — risco de vencimento e desperdício.`);
        ctx.overProduced.slice(0, 3).forEach((p) => lines.push(`  • ${p.name}: +${Math.abs(p.gap)} un excedente`));
      }
      if (ctx.belowMinimum.length > 0) {
        lines.push(`\n**Risco de receita:** ${ctx.belowMinimum.length} produto(s) com risco de ruptura — perda de vendas + insatisfação.`);
      }
      if (ctx.todayLosses === 0 && ctx.overProduced.length === 0 && ctx.belowMinimum.length === 0) {
        lines.push("✅ Sem alertas financeiros no momento.");
      }
      content = lines.join("\n");
      stance = ctx.lossRate > 5 || ctx.belowMinimum.length > 2 ? "alerta" : "neutro";
      break;
    }
    case "perplexity": {
      const lines = ["Do ponto de vista comercial e de mercado:\n"];
      if (ctx.belowMinimum.length > 0) {
        lines.push(`🎯 **Risco para o cliente:** ${ctx.belowMinimum.length} produto(s) podem faltar. Se são populares, clientes migram.`);
      }
      if (ctx.overProduced.length > 0) {
        lines.push("\n💡 **Oportunidade:** Excesso de estoque pode virar ação promocional:");
        ctx.overProduced.slice(0, 3).forEach((p) => lines.push(`  • ${p.name}: +${Math.abs(p.gap)} un — combo, degustação ou desconto`));
      }
      if (ctx.todayProduced > 0) {
        lines.push(`\n📸 Produção de ${ctx.todayProduced} un hoje = conteúdo de bastidores para Instagram.`);
      }
      content = lines.join("\n");
      stance = "neutro";
      break;
    }
    case "grok": {
      const lines = ["Vou ser direto — preciso levantar pontos que talvez ninguém queira ouvir:\n"];
      if (ctx.divergences.length > 0) {
        const big = ctx.divergences.filter((d) => Math.abs(d.diff) >= 3);
        lines.push(`🔍 **${ctx.divergences.length} divergência(s) de contagem.** ${big.length > 0 ? `${big.length} com diferença ≥ 3 un — isso pode ser sistêmico, não pontual.` : "Diferenças pequenas, mas padrão merece atenção."}`);
      }
      if (ctx.lossRate > 2) {
        lines.push(`\n📐 Perda em ${ctx.lossRate}% — ${ctx.lossRate > 5 ? "**preocupante**. Recomendo auditoria do processo produtivo." : "aceitável, mas não ideal."}`);
      }
      if (ctx.pendingApprovals > 3) {
        lines.push(`\n⏳ ${ctx.pendingApprovals} aprovações pendentes — **gargalo**. Se é recorrente, o processo está errado.`);
      }
      if (ctx.dataCompleteness !== "alta") {
        lines.push(`\n🔎 Completude "${ctx.dataCompleteness}" — estamos decidindo com dados incompletos. Cuidado com conclusões.`);
      }
      if (ctx.divergences.length === 0 && ctx.lossRate <= 2 && ctx.pendingApprovals <= 3) {
        lines.push("Surpreendentemente, sem contrapontos fortes hoje. Dados consistentes.");
      }
      content = lines.join("\n");
      stance = "diverge";
      break;
    }
    case "manus": {
      const lines = ["Avaliando viabilidade prática:\n"];
      const steps: string[] = [];
      if (ctx.belowMinimum.length > 0) steps.push(`Produção emergencial: ${ctx.belowMinimum.slice(0, 3).map((p) => p.name).join(", ")}`);
      if (ctx.pendingApprovals > 0) steps.push(`Processar ${ctx.pendingApprovals} aprovação(ões) pendente(s)`);
      if (ctx.divergences.length > 0) steps.push(`Recontagem dos ${ctx.divergences.length} itens divergentes`);
      if (ctx.lossRate > 5) steps.push("Auditoria do processo produtivo");
      if (steps.length > 0) {
        lines.push("**Ações executáveis agora:**");
        steps.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
      } else {
        lines.push("✅ Operação fluindo. Sem ações urgentes necessárias.");
      }
      const improvements: string[] = [];
      if (ctx.dataCompleteness !== "alta") improvements.push("Completar cadastro de configuração de todos os produtos");
      if (ctx.divergences.length > 3) improvements.push("Implementar contagem dupla obrigatória");
      if (ctx.pendingApprovals > 3) improvements.push("Criar regra de auto-aprovação para baixo valor");
      if (improvements.length > 0) {
        lines.push("\n🛠️ **Melhorias de processo:**");
        improvements.forEach((imp) => lines.push(`  • ${imp}`));
      }
      content = lines.join("\n");
      stance = "concorda";
      break;
    }
  }

  const member = getMember(memberId);
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
// GENERATE FULL DEBATE (all 5 members)
// ────────────────────────────────────────────────

function generateFullDebate(ctx: CouncilContextData, question: string): CouncilMessage {
  const severity = assessSeverity(ctx);
  const speeches: DebateSpeech[] = [];

  // 1. CEO Auxiliar opens — frames the problem
  {
    const lines = [`Vamos analisar a pergunta: **"${question}"**\n`];
    const emoji = severity.level === "critico" ? "🔴" : severity.level === "alerta" ? "🟡" : severity.level === "atencao" ? "🟠" : "🟢";
    lines.push(`${emoji} Status geral: **${severity.level.toUpperCase()}**`);
    lines.push(`\n**Dados do dia:** ${ctx.todayProduced} produzidos, ${ctx.todayLosses} perdas (${ctx.lossRate}%), ${ctx.todayTastings} degustações, eficiência ${ctx.productionEfficiency}%`);
    if (severity.reasons.length > 0) {
      lines.push("\n**Pontos de atenção:**");
      severity.reasons.forEach((r) => lines.push(`  → ${r}`));
    }
    lines.push("\nVou passar a palavra para cada conselheiro trazer sua perspectiva.");
    speeches.push({ memberId: "chatgpt", content: lines.join("\n"), stance: "neutro" });
  }

  // 2. CFO — financial view
  {
    const lines: string[] = [];
    if (ctx.todayLosses > 0 || ctx.overProduced.length > 0 || ctx.belowMinimum.length > 0) {
      if (ctx.todayLosses > 0) {
        lines.push(`Perdas de **${ctx.todayLosses} un** (${ctx.lossRate}%) impactam diretamente a margem. ${ctx.lossRate > 5 ? "**Acima do aceitável.** Cada ponto reduzido melhora o resultado." : "Dentro do tolerável, mas vale monitorar."}`);
      }
      if (ctx.overProduced.length > 0) {
        lines.push(`\n**Capital parado** em ${ctx.overProduced.length} produto(s) acima do ideal. Risco de vencimento: ${ctx.overProduced.slice(0, 2).map((p) => `${p.name} (+${Math.abs(p.gap)})`).join(", ")}.`);
      }
      if (ctx.belowMinimum.length > 0) {
        lines.push(`\n**Risco de receita:** ${ctx.belowMinimum.length} produto(s) podem gerar ruptura. Ruptura = perda de venda + insatisfação.`);
      }
    } else {
      lines.push("Sem alertas financeiros críticos. Operação saudável do ponto de vista de custos e perdas.");
    }
    lines.push(`\nEficiência geral: **${ctx.productionEfficiency}%**. ${ctx.productionEfficiency >= 80 ? "Bom nível." : ctx.productionEfficiency >= 50 ? "Há margem para melhoria." : "Nível preocupante."}`);
    speeches.push({
      memberId: "claude",
      content: lines.join("\n"),
      stance: ctx.lossRate > 5 || ctx.belowMinimum.length > 2 ? "alerta" : "concorda",
    });
  }

  // 3. CMO — market/commercial view
  {
    const lines: string[] = [];
    if (ctx.belowMinimum.length > 0) {
      lines.push(`Concordo com Claude sobre o risco de ruptura. Do lado do cliente, **${ctx.belowMinimum.length} produto(s) faltando** pode causar migração para concorrentes.`);
    }
    if (ctx.overProduced.length > 0) {
      lines.push(`\nPor outro lado, vejo **oportunidade** no excesso:`);
      ctx.overProduced.slice(0, 3).forEach((p) => lines.push(`  • ${p.name}: +${Math.abs(p.gap)} un → combo ou promoção relâmpago`));
      lines.push("\nEsses itens podem virar ação no Instagram ou degustação estratégica.");
    }
    if (ctx.todayProduced > 0) {
      lines.push(`\nProdução de **${ctx.todayProduced} un** hoje = conteúdo de bastidores para engajamento.`);
    }
    if (ctx.overProduced.length === 0 && ctx.belowMinimum.length === 0) {
      lines.push("Mix equilibrado hoje. Sem oportunidades promocionais urgentes, mas bom momento para conteúdo de marca.");
    }
    speeches.push({
      memberId: "perplexity",
      content: lines.join("\n"),
      stance: ctx.belowMinimum.length > 0 ? "concorda" : "neutro",
      referencedMember: ctx.belowMinimum.length > 0 ? "claude" : undefined,
    });
  }

  // 4. CIO / Contrarian — challenges the dominant view
  {
    const lines: string[] = [];
    lines.push("Preciso levantar alguns pontos que podem estar passando despercebidos:\n");

    let hasContention = false;

    if (ctx.divergences.length > 0) {
      const big = ctx.divergences.filter((d) => Math.abs(d.diff) >= 3);
      lines.push(`**${ctx.divergences.length} divergência(s) de contagem.** ${big.length > 0 ? `${big.length} com diferença ≥ 3 un — pode ser problema de processo, não apenas contagem.` : "Pequenas, mas a recorrência importa."}`);
      if (big.length > 0) {
        big.slice(0, 3).forEach((d) => lines.push(`  • ${d.productName}: esperado ${d.expected}, contado ${d.counted} (diff: ${d.diff > 0 ? "+" : ""}${d.diff})`));
      }
      hasContention = true;
    }

    if (ctx.overProduced.length > 0) {
      lines.push(`\n**Discordo parcialmente de Perplexity.** Antes de fazer promoção, precisamos entender *por que* estamos produzindo a mais. Se é erro de planejamento, promoção não resolve — mascara o problema.`);
      hasContention = true;
    }

    if (ctx.lossRate > 2) {
      lines.push(`\nPerda de ${ctx.lossRate}% — ${ctx.lossRate > 5 ? "preocupante. Recomendo auditoria antes de novas decisões." : "tolerável, mas questiono: estamos aceitando como normal algo que deveria ser exceção?"}`);
      hasContention = true;
    }

    if (ctx.dataCompleteness !== "alta") {
      lines.push(`\n🔎 **Alerta:** completude "${ctx.dataCompleteness}". Estamos tomando decisões com dados incompletos.`);
      hasContention = true;
    }

    if (!hasContention) {
      lines.push("Surpreendentemente, dados consistentes hoje. Sem contrapontos fortes — o que é raro e bom.");
    }

    speeches.push({
      memberId: "grok",
      content: lines.join("\n"),
      stance: hasContention ? "diverge" : "concorda",
      referencedMember: ctx.overProduced.length > 0 ? "perplexity" : undefined,
    });
  }

  // 5. CTO / Executor — practical feasibility
  {
    const lines: string[] = [];

    if (ctx.divergences.length > 0 || ctx.belowMinimum.length > 0 || ctx.pendingApprovals > 0) {
      lines.push("Concordo com os pontos levantados. Vamos ao que é executável **agora**:\n");
      const steps: string[] = [];
      if (ctx.belowMinimum.length > 0) steps.push(`Produção emergencial dos ${ctx.belowMinimum.length} itens críticos`);
      if (ctx.pendingApprovals > 0) steps.push(`Processar ${ctx.pendingApprovals} aprovação(ões) pendente(s)`);
      if (ctx.divergences.length > 0) steps.push(`Recontagem dos ${ctx.divergences.length} itens divergentes`);
      if (ctx.lossRate > 5) steps.push("Auditoria rápida do processo produtivo");
      steps.forEach((s, i) => lines.push(`**${i + 1}.** ${s}`));
    } else {
      lines.push("Operação fluindo bem. Sem ações urgentes necessárias.");
    }

    const improvements: string[] = [];
    if (ctx.dataCompleteness !== "alta") improvements.push("Completar configuração de produtos (mín/ideal)");
    if (ctx.divergences.length > 3) improvements.push("Implementar contagem dupla obrigatória");
    if (ctx.pendingApprovals > 3) improvements.push("Auto-aprovação para solicitações de baixo impacto");
    if (improvements.length > 0) {
      lines.push("\n🛠️ **Para a próxima sprint:**");
      improvements.forEach((imp) => lines.push(`  • ${imp}`));
    }

    speeches.push({
      memberId: "manus",
      content: lines.join("\n"),
      stance: "concorda",
      referencedMember: ctx.divergences.length > 0 ? "grok" : undefined,
    });
  }

  // 6. CEO Auxiliar closes — synthesis
  {
    const lines = ["**Síntese do debate:**\n"];

    // Convergences
    const conv: string[] = [];
    if (ctx.belowMinimum.length > 0) conv.push("risco de ruptura como prioridade");
    if (ctx.lossRate > 5) conv.push("necessidade de reduzir perdas");
    if (ctx.divergences.length > 0) conv.push("investigar divergências");
    if (conv.length > 0) lines.push(`✅ **Convergências:** ${conv.join(", ")}.`);

    // Divergences
    const div: string[] = [];
    if (ctx.overProduced.length > 0) div.push("CMO quer promoção, Grok questiona se é a causa raiz");
    if (ctx.pendingApprovals > 3) div.push("Grok quer delegar aprovações, Claude prefere controle");
    if (div.length > 0) lines.push(`⚔️ **Divergências:** ${div.join("; ")}.`);

    // Main suggestion
    if (severity.level === "critico" || severity.level === "alerta") {
      const topAction = ctx.belowMinimum.length > 0
        ? `regularizar estoque dos ${ctx.belowMinimum.length} produto(s) críticos`
        : ctx.divergences.length > 0
          ? `investigar ${ctx.divergences.length} divergência(s)`
          : "resolver pendências operacionais";
      lines.push(`\n💡 **Sugestão principal:** ${topAction}.`);
    } else {
      lines.push("\n💡 **Sugestão:** Manter monitoramento. Operação estável.");
    }

    // Main risk
    if (ctx.belowMinimum.length >= 3) lines.push(`\n⚠️ **Risco:** Ruptura em ${ctx.belowMinimum.length} produtos simultaneamente.`);
    else if (ctx.lossRate > 5) lines.push(`\n⚠️ **Risco:** Perda de ${ctx.lossRate}% corroendo margem.`);

    // Missing data
    const missing: string[] = [];
    if (ctx.dataCompleteness !== "alta") missing.push("configuração completa de produtos");
    missing.push("dados de vendas e custos unitários");
    lines.push(`\n❓ **Falta saber:** ${missing.join(", ")}.`);

    // Confidence
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
    quickActions: [
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
  // If directed at a specific member
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
