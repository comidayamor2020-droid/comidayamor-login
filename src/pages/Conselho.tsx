import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Users, Send, AlertTriangle, TrendingUp, ArrowDown, Package,
  CheckCircle, Clock, ChevronDown, ChevronUp, Sparkles,
  ArrowUp, Activity, ShieldAlert,
} from "lucide-react";
import { useCouncilContext, type CouncilContextData } from "@/hooks/use-council-context";
import {
  COUNCIL_MEMBERS,
  RESPONSE_SECTIONS,
  generateV1Response,
  type CouncilResponse,
  type CouncilMember,
} from "@/lib/council";

const PLACEHOLDER_QUESTIONS = [
  "O que precisa de atenção hoje?",
  "Qual deve ser a prioridade da semana?",
  "Onde está o maior risco da operação?",
  "O que o conselho recomenda neste momento?",
  "Quais dados ainda faltam para uma decisão melhor?",
];

// Section icons for visual hierarchy
const SECTION_ICONS: Record<string, string> = {
  leitura_executiva: "📋",
  atencao: "🚨",
  visao_ceo_auxiliar: "🧠",
  visao_cfo: "📊",
  visao_cmo: "🎯",
  visao_cio: "⚡",
  visao_cto: "🔧",
  convergencias: "🤝",
  divergencias: "⚔️",
  sugestao_principal: "💡",
  alternativas: "🔀",
  risco_principal: "⚠️",
  falta_saber: "❓",
  proximo_passo: "👣",
  nivel_confianca: "📐",
};

export default function Conselho() {
  const ctx = useCouncilContext();
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<CouncilResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);

  const placeholderText = useMemo(
    () => PLACEHOLDER_QUESTIONS[Math.floor(Math.random() * PLACEHOLDER_QUESTIONS.length)],
    [],
  );

  const handleAnalyze = () => {
    if (!question.trim() || ctx.loading) return;
    setAnalyzing(true);
    setTimeout(() => {
      const result = generateV1Response(ctx, question.trim());
      setResponse(result);
      setAnalyzing(false);
    }, 2000);
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
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* A) Header executivo */}
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Conselho</h1>
              <p className="text-sm text-muted-foreground">
                Conselho executivo consultivo com IAs especializadas.
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground border-l-2 border-primary/30 pl-3">
            O conselho analisa, sugere e recomenda. A decisão final é sempre humana.
          </p>
        </div>

        {/* B) Cards dos membros */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Membros do Conselho
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {COUNCIL_MEMBERS.map((m) => (
              <MemberCard key={m.id} member={m} />
            ))}
          </div>
        </div>

        {/* C) Painel de contexto enriquecido */}
        <ContextPanel ctx={ctx} open={contextOpen} onToggle={() => setContextOpen(!contextOpen)} />

        {/* D) Campo de pergunta */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Pergunte ao Conselho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={placeholderText}
              className="min-h-[80px] resize-none"
            />
            <div className="flex flex-wrap gap-2">
              {PLACEHOLDER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAnalyze} disabled={!question.trim() || analyzing} size="lg">
                {analyzing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    O Conselho está analisando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Analisar com o Conselho
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analyzing state */}
        {analyzing && (
          <Card className="border-primary/20 animate-pulse">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-2">
                  {COUNCIL_MEMBERS.filter((m) => !m.isHuman).map((m) => (
                    <span key={m.id} className="text-xl animate-bounce" style={{ animationDelay: `${COUNCIL_MEMBERS.indexOf(m) * 0.15}s` }}>
                      {m.avatar}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  O Conselho está analisando os dados e preparando a resposta...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* E) Resposta estruturada */}
        {response && !analyzing && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Resposta do Conselho
              </CardTitle>
              <CardDescription className="text-xs">
                Análise consultiva baseada nos dados operacionais do sistema — a decisão final é sempre do CEO humano.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-0">
              {RESPONSE_SECTIONS.map(({ key, label }, idx) => {
                const content = response[key];
                if (!content) return null;
                const icon = SECTION_ICONS[key] ?? "•";
                return (
                  <div key={key} className="py-4 first:pt-0">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                        <span className="text-base">{icon}</span>
                        <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0">
                          {String(idx + 1).padStart(2, "0")}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-1.5">
                          {label}
                        </p>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-lg p-3">
                          {content}
                        </div>
                      </div>
                    </div>
                    {idx < RESPONSE_SECTIONS.length - 1 && <Separator className="mt-4" />}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

// ────────────────────────────────────────────
// SUB COMPONENTS
// ────────────────────────────────────────────

function MemberCard({ member }: { member: CouncilMember }) {
  return (
    <Card className={`text-center transition-shadow hover:shadow-md ${member.isHuman ? "border-primary/30 bg-primary/5" : ""}`}>
      <CardContent className="p-3">
        <div className="text-2xl mb-1">{member.avatar}</div>
        <p className="text-xs font-semibold text-foreground truncate">{member.name}</p>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{member.role}</p>
        {member.isHuman && (
          <Badge variant="secondary" className="mt-1.5 text-[9px]">Humano</Badge>
        )}
      </CardContent>
    </Card>
  );
}

function ContextPanel({
  ctx,
  open,
  onToggle,
}: {
  ctx: CouncilContextData;
  open: boolean;
  onToggle: () => void;
}) {
  const completenessColor =
    ctx.dataCompleteness === "alta" ? "text-emerald-600" :
    ctx.dataCompleteness === "media" ? "text-amber-600" :
    ctx.dataCompleteness === "baixa" ? "text-orange-600" : "text-destructive";

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <div>
              <CardTitle className="text-sm font-medium">Contexto Operacional do Dia</CardTitle>
              <CardDescription className="text-xs">
                Dados que o Conselho está enxergando —{" "}
                <span className={`font-medium ${completenessColor}`}>
                  completude {ctx.dataCompleteness}
                </span>
              </CardDescription>
            </div>
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-8">
          <StatBadge icon={<Package className="h-3 w-3" />} label="Produtos" value={ctx.totalProducts} />
          <StatBadge icon={<TrendingUp className="h-3 w-3" />} label="Produzido" value={ctx.todayProduced} color="text-emerald-600" />
          <StatBadge icon={<ArrowDown className="h-3 w-3" />} label="Perdas" value={ctx.todayLosses} color="text-destructive" />
          <StatBadge icon={<Package className="h-3 w-3" />} label="Degustações" value={ctx.todayTastings} color="text-amber-600" />
          <StatBadge icon={<AlertTriangle className="h-3 w-3" />} label="Divergências" value={ctx.divergences.length} color="text-destructive" />
          <StatBadge icon={<Clock className="h-3 w-3" />} label="Pendentes" value={ctx.pendingApprovals} color="text-amber-600" />
          <StatBadge icon={<ArrowDown className="h-3 w-3" />} label="Abaixo Ideal" value={ctx.underProduced.length} color="text-orange-600" />
          <StatBadge icon={<ArrowUp className="h-3 w-3" />} label="Acima Ideal" value={ctx.overProduced.length} color="text-blue-600" />
        </div>

        {/* Efficiency bar */}
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground shrink-0">Eficiência estoque:</span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                ctx.productionEfficiency >= 80 ? "bg-emerald-500" :
                ctx.productionEfficiency >= 50 ? "bg-amber-500" : "bg-destructive"
              }`}
              style={{ width: `${Math.min(ctx.productionEfficiency, 100)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-foreground">{ctx.productionEfficiency}%</span>
        </div>

        {open && (
          <div className="mt-4 space-y-3">
            <Separator />

            {/* Below minimum */}
            {ctx.belowMinimum.length > 0 && (
              <DetailSection
                title={`🔴 Abaixo do mínimo (${ctx.belowMinimum.length})`}
                titleColor="text-destructive"
              >
                {ctx.belowMinimum.map((p, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{p.name}</span>
                    <span className="font-medium text-destructive">
                      {p.current} / {p.minimum} (ideal: {p.ideal})
                    </span>
                  </div>
                ))}
              </DetailSection>
            )}

            {/* Under produced */}
            {ctx.underProduced.length > 0 && (
              <DetailSection
                title={`📉 Abaixo do ideal do dia (${ctx.underProduced.length})`}
                titleColor="text-orange-600"
              >
                {ctx.underProduced.slice(0, 8).map((p, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{p.name}</span>
                    <span className="font-medium text-orange-600">
                      {p.current} / {p.ideal} (faltam {p.gap})
                    </span>
                  </div>
                ))}
              </DetailSection>
            )}

            {/* Over produced */}
            {ctx.overProduced.length > 0 && (
              <DetailSection
                title={`📈 Acima do ideal do dia (${ctx.overProduced.length})`}
                titleColor="text-blue-600"
              >
                {ctx.overProduced.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{p.name}</span>
                    <span className="font-medium text-blue-600">
                      {p.current} / {p.ideal} (excesso: {Math.abs(p.gap)})
                    </span>
                  </div>
                ))}
              </DetailSection>
            )}

            {/* Divergences */}
            {ctx.divergences.length > 0 && (
              <DetailSection
                title={`⚠️ Divergências de contagem (${ctx.divergences.length})`}
                titleColor="text-amber-600"
              >
                {ctx.divergences.slice(0, 5).map((d, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{d.productName}</span>
                    <span className="font-medium text-amber-600">
                      esperado {d.expected} → contado {d.counted} ({d.diff > 0 ? "+" : ""}{d.diff})
                    </span>
                  </div>
                ))}
              </DetailSection>
            )}

            {/* Pending occurrences */}
            {ctx.pendingOccurrences.length > 0 && (
              <DetailSection
                title={`🔔 Aprovações pendentes (${ctx.pendingOccurrences.length})`}
                titleColor="text-amber-600"
              >
                {ctx.pendingOccurrences.slice(0, 5).map((o, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{o.productName} ({o.type})</span>
                    <span className="font-medium text-amber-600">
                      {o.quantity} un — {o.reason}
                    </span>
                  </div>
                ))}
              </DetailSection>
            )}

            {/* Active scheduled */}
            {ctx.activeScheduled.length > 0 && (
              <DetailSection title={`📋 Programações ativas (${ctx.activeScheduled.length})`}>
                {ctx.activeScheduled.slice(0, 5).map((s, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {s.name}
                      {s.priority === "urgente" || s.priority === "alta" ? " ⚡" : ""}
                    </span>
                    <span className="text-muted-foreground">
                      {s.completedItems}/{s.totalItems} itens — prazo: {s.deadline}
                    </span>
                  </div>
                ))}
              </DetailSection>
            )}

            {/* Today observations */}
            {ctx.todayLotes.filter((l) => l.observation).length > 0 && (
              <DetailSection title="📝 Observações do dia">
                {ctx.todayLotes
                  .filter((l) => l.observation)
                  .slice(0, 5)
                  .map((l, i) => (
                    <div key={i} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{l.productName}:</span>{" "}
                      {l.observation}
                    </div>
                  ))}
              </DetailSection>
            )}

            {/* Loss rate */}
            {ctx.todayProduced > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <ShieldAlert className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                  Taxa de perda:{" "}
                  <span className={`font-bold ${ctx.lossRate > 5 ? "text-destructive" : ctx.lossRate > 2 ? "text-amber-600" : "text-emerald-600"}`}>
                    {ctx.lossRate}%
                  </span>
                  {" "}({ctx.todayLosses} perdas / {ctx.todayProduced} produzidos)
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetailSection({
  title,
  titleColor,
  children,
}: {
  title: string;
  titleColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className={`text-xs font-medium mb-1.5 ${titleColor ?? "text-foreground"}`}>{title}</p>
      <div className="space-y-1 pl-1">{children}</div>
    </div>
  );
}

function StatBadge({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border p-2">
      <div className={`flex items-center gap-1 ${color ?? "text-foreground"}`}>
        {icon}
        <span className="text-lg font-bold">{value}</span>
      </div>
      <span className="text-[10px] text-muted-foreground text-center">{label}</span>
    </div>
  );
}
