import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Users, Send, AlertTriangle, TrendingUp, ArrowDown, Package,
  CheckCircle, Clock, ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";
import { useCouncilContext } from "@/hooks/use-council-context";
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

export default function Conselho() {
  const { loading, contextString, stats } = useCouncilContext();
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<CouncilResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  const handleAnalyze = () => {
    if (!question.trim() || loading) return;
    setAnalyzing(true);
    // Simulate processing delay for V1
    setTimeout(() => {
      const result = generateV1Response(contextString, question.trim());
      setResponse(result);
      setAnalyzing(false);
    }, 1500);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
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

        {/* C) Painel de contexto */}
        <Card>
          <CardHeader className="pb-3 cursor-pointer" onClick={() => setContextOpen(!contextOpen)}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Contexto Operacional do Dia</CardTitle>
                <CardDescription className="text-xs">
                  Dados que o Conselho está enxergando agora
                </CardDescription>
              </div>
              {contextOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Summary stats always visible */}
            <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
              <StatBadge icon={<Package className="h-3 w-3" />} label="Produtos" value={stats.totalProducts} />
              <StatBadge icon={<TrendingUp className="h-3 w-3" />} label="Produzido" value={stats.todayProduced} color="text-emerald-600" />
              <StatBadge icon={<ArrowDown className="h-3 w-3" />} label="Perdas" value={stats.todayLosses} color="text-destructive" />
              <StatBadge icon={<Package className="h-3 w-3" />} label="Degustações" value={stats.todayTastings} color="text-amber-600" />
              <StatBadge icon={<AlertTriangle className="h-3 w-3" />} label="Divergências" value={stats.divergences} color="text-destructive" />
              <StatBadge icon={<Clock className="h-3 w-3" />} label="Pendentes" value={stats.pendingApprovals} color="text-amber-600" />
            </div>

            {contextOpen && (
              <div className="mt-4">
                <Separator className="mb-3" />

                {stats.belowMinimum.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-destructive mb-1">
                      🔴 Abaixo do mínimo ({stats.belowMinimum.length})
                    </p>
                    <div className="space-y-1">
                      {stats.belowMinimum.map((p, i) => (
                        <div key={i} className="flex justify-between text-xs text-muted-foreground">
                          <span>{p.name}</span>
                          <span className="font-medium text-destructive">
                            {p.current} / {p.minimum}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.activeScheduled.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">
                      📋 Programações ativas ({stats.activeScheduled.length})
                    </p>
                    <div className="space-y-1">
                      {stats.activeScheduled.slice(0, 5).map((s, i) => (
                        <div key={i} className="flex justify-between text-xs text-muted-foreground">
                          <span>{s.name}</span>
                          <span>{s.deadline}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator className="my-3" />
                <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-[11px] text-muted-foreground font-mono leading-relaxed max-h-48 overflow-y-auto">
                  {contextString}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

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
              placeholder={PLACEHOLDER_QUESTIONS[Math.floor(Math.random() * PLACEHOLDER_QUESTIONS.length)]}
              className="min-h-[80px] resize-none"
            />
            <div className="flex flex-wrap gap-2">
              {PLACEHOLDER_QUESTIONS.slice(0, 3).map((q) => (
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
              <Button onClick={handleAnalyze} disabled={!question.trim() || analyzing}>
                {analyzing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Analisando...
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

        {/* E) Resposta estruturada */}
        {response && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Resposta do Conselho
              </CardTitle>
              <CardDescription className="text-xs">
                Análise consultiva — a decisão final é sempre do CEO humano.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {RESPONSE_SECTIONS.map(({ key, label }, idx) => {
                const content = response[key];
                if (!content) return null;
                return (
                  <div key={key}>
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="shrink-0 text-[10px] font-mono">
                        {String(idx + 1).padStart(2, "0")}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {content}
                        </p>
                      </div>
                    </div>
                    {idx < RESPONSE_SECTIONS.length - 1 && <Separator className="mt-3" />}
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

function MemberCard({ member }: { member: CouncilMember }) {
  return (
    <Card className={`text-center ${member.isHuman ? "border-primary/30 bg-primary/5" : ""}`}>
      <CardContent className="p-3">
        <div className="text-2xl mb-1">{member.avatar}</div>
        <p className="text-xs font-semibold text-foreground truncate">{member.name}</p>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{member.role}</p>
        {member.isHuman && (
          <Badge variant="secondary" className="mt-1.5 text-[9px]">
            Humano
          </Badge>
        )}
      </CardContent>
    </Card>
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
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
