import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import {
  Users, Send, AlertTriangle, TrendingUp, ArrowDown, Package,
  Clock, ChevronDown, ChevronUp, Sparkles, Plus,
  ArrowUp, Activity, ShieldAlert,
} from "lucide-react";
import { useCouncilContext, type CouncilContextData } from "@/hooks/use-council-context";
import {
  COUNCIL_MEMBERS,
  RESPONSE_SECTIONS,
  QUICK_ACTIONS,
  generateConversationalResponse,
  type CouncilResponse,
  type CouncilMember,
  type CouncilMessage,
} from "@/lib/council";

const PLACEHOLDER_QUESTIONS = [
  "O que precisa de atenção hoje?",
  "Qual deve ser a prioridade da semana?",
  "Onde está o maior risco da operação?",
  "O que o conselho recomenda neste momento?",
  "Quais dados ainda faltam para uma decisão melhor?",
];

const SECTION_ICONS: Record<string, string> = {
  leitura_executiva: "📋", atencao: "🚨", visao_ceo_auxiliar: "🧠",
  visao_cfo: "📊", visao_cmo: "🎯", visao_cio: "⚡", visao_cto: "🔧",
  convergencias: "🤝", divergencias: "⚔️", sugestao_principal: "💡",
  alternativas: "🔀", risco_principal: "⚠️", falta_saber: "❓",
  proximo_passo: "👣", nivel_confianca: "📐",
};

export default function Conselho() {
  const ctx = useCouncilContext();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<CouncilMessage[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleSend = useCallback((text?: string) => {
    const q = (text ?? input).trim();
    if (!q || ctx.loading || analyzing) return;

    const userMsg: CouncilMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: q,
      isStructured: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAnalyzing(true);

    setTimeout(() => {
      const response = generateConversationalResponse(ctx, q, [...messages, userMsg]);
      setMessages((prev) => [...prev, response]);
      setAnalyzing(false);
    }, 1200 + Math.random() * 800);
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
                Conversa estratégica com IAs especializadas · A decisão final é sempre humana.
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

        {/* Context panel (collapsible) */}
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
                  <ChatBubble key={msg.id} message={msg} onQuickAction={handleSend} />
                ))}
                {analyzing && <AnalyzingIndicator />}
                <div ref={chatEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input bar */}
          <div className="border-t border-border p-3 bg-background/50 shrink-0">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte ao Conselho..."
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ────────────────────────────────────────────
// EMPTY STATE — shown when no messages yet
// ────────────────────────────────────────────

function EmptyState({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-6">
      {/* Member avatars */}
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
        <p className="text-sm font-medium text-foreground">Como posso ajudar hoje?</p>
        <p className="text-xs text-muted-foreground max-w-md">
          Faça perguntas sobre a operação, riscos, finanças ou qualquer tema estratégico.
          O Conselho analisa os dados do sistema e recomenda ações.
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
// CHAT BUBBLE
// ────────────────────────────────────────────

function ChatBubble({
  message,
  onQuickAction,
}: {
  message: CouncilMessage;
  onQuickAction: (q: string) => void;
}) {
  if (message.role === "user") {
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

  // Council response
  return (
    <div className="flex gap-2.5 max-w-[90%]">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border shrink-0 mt-0.5 text-sm">
        🧠
      </div>
      <div className="flex-1 space-y-2">
        <div className="rounded-2xl rounded-bl-md bg-muted/50 border border-border/50 px-4 py-3">
          {message.isStructured && message.structured ? (
            <StructuredResponse response={message.structured} />
          ) : (
            <div className="prose prose-sm max-w-none text-sm text-foreground [&_strong]:text-foreground [&_p]:text-muted-foreground [&_p]:leading-relaxed">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground/60 mt-2">
            {message.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Quick actions */}
        {message.quickActions && message.quickActions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
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
    </div>
  );
}

// ────────────────────────────────────────────
// STRUCTURED RESPONSE (full analysis mode)
// ────────────────────────────────────────────

function StructuredResponse({ response }: { response: CouncilResponse }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-primary uppercase tracking-wider">Análise Estruturada do Conselho</p>
      {RESPONSE_SECTIONS.map(({ key, label }, idx) => {
        const content = response[key];
        if (!content) return null;
        const icon = SECTION_ICONS[key] ?? "•";
        return (
          <div key={key}>
            <div className="flex items-start gap-2">
              <span className="text-sm shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-foreground uppercase tracking-wide mb-1">{label}</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{content}</p>
              </div>
            </div>
            {idx < RESPONSE_SECTIONS.length - 1 && <Separator className="mt-2" />}
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────
// ANALYZING INDICATOR
// ────────────────────────────────────────────

function AnalyzingIndicator() {
  return (
    <div className="flex gap-2.5 max-w-[90%]">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border shrink-0 mt-0.5 text-sm">
        🧠
      </div>
      <div className="rounded-2xl rounded-bl-md bg-muted/50 border border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {COUNCIL_MEMBERS.filter((m) => !m.isHuman).map((m, i) => (
              <span
                key={m.id}
                className="text-sm animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                {m.avatar}
              </span>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">Analisando...</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// CONTEXT PANEL (compact)
// ────────────────────────────────────────────

function ContextPanel({ ctx }: { ctx: CouncilContextData }) {
  const completenessColor =
    ctx.dataCompleteness === "alta" ? "text-emerald-600" :
    ctx.dataCompleteness === "media" ? "text-amber-600" :
    ctx.dataCompleteness === "baixa" ? "text-orange-600" : "text-destructive";

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
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────
// STAT BADGE (compact)
// ────────────────────────────────────────────

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-md border border-border p-1.5">
      <span className={`text-sm font-bold ${color ?? "text-foreground"}`}>{value}</span>
      <span className="text-[9px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}
