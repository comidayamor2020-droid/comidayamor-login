import { useState, useMemo, lazy, Suspense } from "react";
import { Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_ROUTES, type AppRole } from "@/lib/roles";

const ClientesB2B = lazy(() => import("./ClientesB2B"));
const MeusPedidos = lazy(() => import("./MeusPedidos"));
const Producao = lazy(() => import("./Producao"));

type TabKey = "clientes" | "pedidos" | "producao";

interface TabDef {
  key: TabKey;
  label: string;
  route: string;
  Component: React.ComponentType;
}

const ALL_TABS: TabDef[] = [
  { key: "clientes", label: "Clientes B2B", route: "/clientes-b2b", Component: ClientesB2B },
  { key: "pedidos", label: "Pedidos", route: "/b2b/pedidos", Component: MeusPedidos },
  { key: "producao", label: "Produção do Pedido", route: "/producao", Component: Producao },
];

export default function CentralB2B() {
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
          Você não tem acesso a nenhuma área da Central B2B.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="fixed left-0 right-0 top-0 z-30 border-b border-border bg-card/95 backdrop-blur md:left-60">
        <div className="flex items-center gap-2 overflow-x-auto px-4 py-2">
          <div className="mr-2 hidden items-center gap-2 text-sm font-semibold text-foreground md:flex">
            <Store className="h-4 w-4" />
            Central B2B
          </div>
          {tabs.length === 1 ? (
            <span className="text-sm font-medium text-foreground">{tabs[0].label}</span>
          ) : (
            tabs.map((t) => {
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
            })
          )}
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
