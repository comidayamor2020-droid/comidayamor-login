import { useState, lazy, Suspense } from "react";
import { LayoutGrid } from "lucide-react";

// Reutiliza as páginas operacionais existentes EXATAMENTE como estão.
// Cada uma traz seu próprio DashboardLayout/conteúdo — nada é reescrito aqui.
const ResumoOperacional = lazy(() => import("./op/ResumoOperacional"));
const ProducaoDia = lazy(() => import("./op/ProducaoDia"));
const EstoqueLoja = lazy(() => import("./op/EstoqueLoja"));
const Conciliacao = lazy(() => import("./op/Conciliacao"));
const Aprovacoes = lazy(() => import("./op/Aprovacoes"));
const ProducoesProgamadas = lazy(() => import("./op/ProducoesProgamadas"));

type TabKey =
  | "resumo"
  | "producao-dia"
  | "estoque"
  | "conciliacao"
  | "aprovacoes"
  | "programadas";

const TABS: { key: TabKey; label: string; Component: React.ComponentType }[] = [
  { key: "resumo", label: "Resumo", Component: ResumoOperacional },
  { key: "producao-dia", label: "Produção do Dia", Component: ProducaoDia },
  { key: "estoque", label: "Estoque / Contagem", Component: EstoqueLoja },
  { key: "conciliacao", label: "Conciliação", Component: Conciliacao },
  { key: "aprovacoes", label: "Aprovações", Component: Aprovacoes },
  { key: "programadas", label: "Programadas", Component: ProducoesProgamadas },
];

export default function CentralOperacional() {
  const [active, setActive] = useState<TabKey>("resumo");
  const Current = TABS.find((t) => t.key === active)!.Component;

  return (
    <div className="relative">
      {/* Barra de abas fixa, sobreposta ao topo do conteúdo da página interna */}
      <div className="fixed left-0 right-0 top-0 z-30 border-b border-border bg-card/95 backdrop-blur md:left-60">
        <div className="flex items-center gap-2 overflow-x-auto px-4 py-2">
          <div className="mr-2 hidden items-center gap-2 text-sm font-semibold text-foreground md:flex">
            <LayoutGrid className="h-4 w-4" />
            Central Operacional
          </div>
          {TABS.map((t) => {
            const isActive = t.key === active;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Espaço para a faixa de abas não cobrir o conteúdo da página interna */}
      <div className="pt-12">
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-background">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
            </div>
          }
        >
          <Current />
        </Suspense>
      </div>
    </div>
  );
}
