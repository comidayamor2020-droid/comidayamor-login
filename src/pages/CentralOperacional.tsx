import { useState, useMemo, lazy, Suspense } from "react";
import { LayoutGrid } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_ROUTES, type AppRole } from "@/lib/roles";

// Reutiliza as páginas operacionais existentes EXATAMENTE como estão.
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

interface TabDef {
  key: TabKey;
  label: string;
  /** Rota original em ROLE_ROUTES usada para checar permissão. */
  route: string;
  Component: React.ComponentType;
}

const ALL_TABS: TabDef[] = [
  { key: "resumo", label: "Resumo", route: "/op", Component: ResumoOperacional },
  { key: "producao-dia", label: "Produção do Dia", route: "/op/producao-dia", Component: ProducaoDia },
  { key: "estoque", label: "Estoque / Contagem", route: "/op/estoque-loja", Component: EstoqueLoja },
  { key: "conciliacao", label: "Conciliação", route: "/op/conciliacao", Component: Conciliacao },
  { key: "aprovacoes", label: "Aprovações", route: "/op/aprovacoes", Component: Aprovacoes },
  { key: "programadas", label: "Programadas", route: "/op/programadas", Component: ProducoesProgamadas },
];

export default function CentralOperacional() {
  const { profile } = useAuth();
  const role = (profile?.role as AppRole) ?? null;
  const allowedRoutes = role ? (ROLE_ROUTES[role] ?? []) : [];

  const tabs = useMemo(
    () => ALL_TABS.filter((t) => allowedRoutes.includes(t.route)),
    [allowedRoutes],
  );

  const [active, setActive] = useState<TabKey | null>(tabs[0]?.key ?? null);
  const Current = tabs.find((t) => t.key === active)?.Component ?? tabs[0]?.Component;

  if (tabs.length === 0 || !Current) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <p className="text-sm text-muted-foreground">
          Você não tem acesso a nenhuma área operacional.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Barra de abas fixa, sobreposta ao topo do conteúdo da página interna */}
      <div className="fixed left-0 right-0 top-0 z-30 border-b border-border bg-card/95 backdrop-blur md:left-60">
        <div className="flex items-center gap-2 overflow-x-auto px-4 py-2">
          <div className="mr-2 hidden items-center gap-2 text-sm font-semibold text-foreground md:flex">
            <LayoutGrid className="h-4 w-4" />
            Central Operacional
          </div>
          {tabs.map((t) => {
            const isActive = t.key === (active ?? tabs[0].key);
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
