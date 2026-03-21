import { useState, useRef, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import {
  Users, Send, ChevronDown, ChevronUp, Plus, Activity,
} from "lucide-react";
import { useCouncilContext, type CouncilContextData } from "@/hooks/use-council-context";
import {
  COUNCIL_MEMBERS,
  AI_MEMBERS,
  getMember,
  generateCouncilResponse,
  type CouncilMessage,
  type DebateSpeech,
} from "@/lib/council";

const PLACEHOLDER_QUESTIONS = [
  "O que precisa de atenção hoje?",
  "Qual deve ser a prioridade da semana?",
  "Onde está o maior risco da operação?",
  "Quais dados ainda faltam para decidir melhor?",
];

export default function Conselho() {
  const ctx = useCouncilContext();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<CouncilMessage[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [revealedSpeeches, setRevealedSpeeches] = useState<Record<string, number>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, revealedSpeeches, scrollToBottom]);

  // Progressive reveal of speeches
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "debate" || !lastMsg.speeches) return;

    const totalSpeeches = lastMsg.speeches.length;
    const revealed = revealedSpeeches[lastMsg.id] ?? 0;

    if (revealed < totalSpeeches) {
      const timer = setTimeout(() => {
        setRevealedSpeeches((prev) => ({ ...prev, [lastMsg.id]: revealed + 1 }));
      }, 600 + Math.random() * 400);
      return () => clearTimeout(timer);
    } else if (revealed === totalSpeeches && analyzing) {
      setAnalyzing(false);
    }
  }, [messages, revealedSpeeches, analyzing]);

  const handleSend = useCallback((text?: string) => {
    const q = (text ?? input).trim();
    if (!q || ctx.loading || analyzing) return;

    const userMsg: CouncilMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: q,
      timestamp: new Date(),
      mode: "debate",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAnalyzing(true);

    setTimeout(() => {
      const response = generateCouncilResponse(ctx, q, [...messages, userMsg]);
      setRevealedSpeeches((prev) => ({ ...prev, [response.id]: 0 }));
      setMessages((prev) => [...prev, response]);
    }, 400);
  }, [input, ctx, analyzing, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setInput("");
    setAnalyzing(false);
    setRevealedSpeeches({});
  };

  if (ctx.loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center gap-3 p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
          <p className="text-sm text-muted-foreground">Carregando dados do sistema...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Conselho</h1>
              <p className="text-xs text-muted-foreground">
                Debate estratégico entre IAs especializadas · A decisão final é sempre humana.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setContextOpen(!contextOpen)}>
              <Activity className="h-3.5 w-3.5 mr-1" />
              Contexto
              {contextOpen ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>
            {messages.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleNewConversation}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nova conversa
              </Button>
            )}
          </div>
        </div>

        {contextOpen && (
          <div className="shrink-0 mb-3">
            <ContextPanel ctx={ctx} />
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 min-h-0 rounded-lg border border-border bg-card overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <EmptyState onSelect={handleSend} />
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  msg.role === "user" ? (
                    <UserBubble key={msg.id} message={msg} />
                  ) : (
                    <DebateBlock
                      key={msg.id}
                      message={msg}
                      revealedCount={revealedSpeeches[msg.id] ?? 0}
                      onQuickAction={handleSend}
                    />
                  )
                ))}
                {analyzing && revealedSpeeches[messages[messages.length - 1]?.id] === undefined && (
                  <AnalyzingIndicator />
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border p-3 bg-background/50 shrink-0">
            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte ao Conselho ou direcione a um membro..."
                className="min-h-[44px] max-h-[120px] resize-none text-sm"
                rows={1}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || analyzing}
                size="icon"
                className="shrink-0 h-[44px] w-[44px]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 pl-1">
              Dica: direcione para um membro — ex: "Claude, analise os custos" ou "Grok, critique essa ideia"
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ────────────────────────────────────────────
// EMPTY STATE
// ────────────────────────────────────────────

function EmptyState({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-6">
      <div className="flex gap-1">
        {COUNCIL_MEMBERS.map((m) => (
          <div
            key={m.id}
            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg
              ${m.isHuman ? "border-primary/40 bg-primary/10" : "border-border bg-muted/50"}`}
            title={`${m.name} — ${m.role}`}
          >
            {m.avatar}
          </div>
        ))}
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">Inicie um debate estratégico</p>
        <p className="text-xs text-muted-foreground max-w-md">
          Faça uma pergunta e os membros do Conselho vão debater, cada um trazendo sua perspectiva.
          Você pode aprofundar com qualquer membro depois.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 max-w-lg">
        {PLACEHOLDER_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// USER BUBBLE
// ────────────────────────────────────────────

function UserBubble({ message }: { message: CouncilMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2.5">
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className="text-[10px] opacity-60 mt-1 text-right">
          {message.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// DEBATE BLOCK — sequential member speeches
// ────────────────────────────────────────────

function DebateBlock({
  message,
  revealedCount,
  onQuickAction,
}: {
  message: CouncilMessage;
  revealedCount: number;
  onQuickAction: (q: string) => void;
}) {
  const speeches = message.speeches ?? [];
  const visibleSpeeches = speeches.slice(0, revealedCount);
  const isRevealing = revealedCount < speeches.length;

  return (
    <div className="space-y-3">
      {visibleSpeeches.map((speech, idx) => (
        <SpeechBubble key={`${message.id}-${idx}`} speech={speech} />
      ))}

      {isRevealing && (
        <TypingIndicator memberId={speeches[revealedCount]?.memberId} />
      )}

      {!isRevealing && message.quickActions && message.quickActions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-11">
          {message.quickActions.map((action) => (
            <button
              key={action}
              onClick={() => onQuickAction(action)}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// INDIVIDUAL SPEECH BUBBLE
// ────────────────────────────────────────────

const STANCE_LABELS: Record<string, { label: string; className: string }> = {
  concorda: { label: "concorda", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  diverge: { label: "diverge", className: "bg-destructive/10 text-destructive" },
  alerta: { label: "alerta", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  sintetiza: { label: "síntese", className: "bg-primary/10 text-primary" },
  neutro: { label: "", className: "" },
};

function SpeechBubble({ speech }: { speech: DebateSpeech }) {
  const member = getMember(speech.memberId);
  const stanceInfo = STANCE_LABELS[speech.stance ?? "neutro"];
  const referencedMember = speech.referencedMember ? getMember(speech.referencedMember) : null;
  const isSynthesis = speech.stance === "sintetiza";

  return (
    <div className="flex gap-2.5 max-w-[92%] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full border shrink-0 mt-0.5 text-sm"
        style={{
          borderColor: member.color,
          backgroundColor: `${member.color}15`,
        }}
      >
        {member.avatar}
      </div>
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-foreground">{member.name}</span>
          <span className="text-[10px] text-muted-foreground">{member.role}</span>
          {stanceInfo.label && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${stanceInfo.className}`}>
              {stanceInfo.label}
            </span>
          )}
          {referencedMember && (
            <span className="text-[10px] text-muted-foreground italic">
              → respondendo {referencedMember.name}
            </span>
          )}
        </div>

        {/* Content */}
        <div
          className={`rounded-2xl rounded-tl-md px-4 py-3 ${
            isSynthesis
              ? "bg-primary/5 border border-primary/20"
              : "bg-muted/50 border border-border/50"
          }`}
        >
          <div className="prose prose-sm max-w-none text-sm text-foreground [&_strong]:text-foreground [&_p]:text-muted-foreground [&_p]:leading-relaxed">
            <ReactMarkdown>{speech.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// TYPING INDICATOR
// ────────────────────────────────────────────

function TypingIndicator({ memberId }: { memberId?: string }) {
  const member = memberId ? getMember(memberId) : null;

  return (
    <div className="flex gap-2.5 max-w-[92%]">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full border shrink-0 mt-0.5 text-sm"
        style={member ? {
          borderColor: member.color,
          backgroundColor: `${member.color}15`,
        } : {}}
      >
        {member?.avatar ?? "🧠"}
      </div>
      <div className="rounded-2xl rounded-tl-md bg-muted/50 border border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">{member?.name ?? "Conselho"}</span>
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0s" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0.15s" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0.3s" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// ANALYZING INDICATOR
// ────────────────────────────────────────────

function AnalyzingIndicator() {
  return (
    <div className="flex gap-2.5 max-w-[92%]">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border shrink-0 mt-0.5 text-sm">
        🧠
      </div>
      <div className="rounded-2xl rounded-tl-md bg-muted/50 border border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {AI_MEMBERS.map((m, i) => (
              <span key={m.id} className="text-sm animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}>
                {m.avatar}
              </span>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">Convocando o Conselho...</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// CONTEXT PANEL
// ────────────────────────────────────────────

function ContextPanel({ ctx }: { ctx: CouncilContextData }) {
  const completenessColor =
    ctx.dataCompleteness === "alta" ? "text-emerald-600" :
    ctx.dataCompleteness === "media" ? "text-amber-600" :
    ctx.dataCompleteness === "baixa" ? "text-orange-600" : "text-destructive";

  const cf = ctx.cashFlow;
  const cashColor =
    cf.alertLevel === "critico" ? "text-destructive" :
    cf.alertLevel === "alerta" ? "text-amber-600" :
    cf.alertLevel === "atencao" ? "text-orange-600" : "text-emerald-600";

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">Contexto do Dia</span>
          <span className={`text-[10px] font-medium ${completenessColor}`}>
            (completude {ctx.dataCompleteness})
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
          <StatBadge label="Produtos" value={ctx.totalProducts} />
          <StatBadge label="Produzido" value={ctx.todayProduced} color="text-emerald-600" />
          <StatBadge label="Perdas" value={ctx.todayLosses} color="text-destructive" />
          <StatBadge label="Degustações" value={ctx.todayTastings} color="text-amber-600" />
          <StatBadge label="Divergências" value={ctx.divergences.length} color="text-destructive" />
          <StatBadge label="Pendentes" value={ctx.pendingApprovals} color="text-amber-600" />
          <StatBadge label="Abaixo Ideal" value={ctx.underProduced.length} color="text-orange-600" />
          <StatBadge label="Eficiência" value={`${ctx.productionEfficiency}%`} color={ctx.productionEfficiency >= 80 ? "text-emerald-600" : ctx.productionEfficiency >= 50 ? "text-amber-600" : "text-destructive"} />
        </div>

        {/* Cash Flow Summary */}
        {(cf.totalCompromissos > 0 || cf.alertLevel !== "normal") && (
          <>
            <Separator className="my-2" />
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-foreground">💰 Caixa</span>
              <span className={`text-[10px] font-semibold uppercase ${cashColor}`}>
                {cf.alertLevel}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
              <StatBadge label="Caixa" value={fmtBRL(cf.caixaDisponivel)} color={cashColor} />
              {cf.totalVencidas > 0 && <StatBadge label="Vencidas" value={fmtBRL(cf.totalVencidas)} color="text-destructive" />}
              {cf.totalProx2Dias > 0 && <StatBadge label="2 dias" value={fmtBRL(cf.totalProx2Dias)} color="text-orange-600" />}
              {cf.totalProx7Dias > 0 && <StatBadge label="7 dias" value={fmtBRL(cf.totalProx7Dias)} color="text-amber-600" />}
              <StatBadge label="Compromissos" value={fmtBRL(cf.totalCompromissos)} />
              <StatBadge label={cf.folgaOuDeficit >= 0 ? "Folga" : "DÉFICIT"} value={fmtBRL(cf.folgaOuDeficit)} color={cf.folgaOuDeficit >= 0 ? "text-emerald-600" : "text-destructive"} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatBadge({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="flex flex-col items-center rounded-md border border-border p-1.5">
      <span className={`text-sm font-bold ${color ?? "text-foreground"}`}>{value}</span>
      <span className="text-[9px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}
