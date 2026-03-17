import {
  LayoutDashboard, FileText, LogOut, Package, Factory, Store,
  ClipboardList, ShoppingBag, Building2, Users,
  BarChart3, Zap, ArrowLeftRight, CheckCircle, Settings, Calendar, X,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_ROUTES, type AppRole } from "@/lib/roles";

const FINANCIAL_NAV = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "DRE", url: "/dre", icon: FileText },
  { title: "Produtos", url: "/produtos", icon: ShoppingBag },
  { title: "Clientes B2B", url: "/clientes-b2b", icon: Building2 },
  { title: "Usuários", url: "/usuarios", icon: Users },
  { title: "Compras", url: "/compras", icon: Package },
  { title: "Produção", url: "/producao", icon: Factory },
  { title: "Portal B2B", url: "/b2b", icon: Store },
  { title: "Meus Pedidos", url: "/b2b/pedidos", icon: ClipboardList },
];

const OPERATIONAL_NAV = [
  { title: "Resumo Operacional", url: "/op", icon: BarChart3 },
  { title: "Produção do Dia", url: "/op/producao-dia", icon: Zap },
  { title: "Estoque da Loja", url: "/op/estoque-loja", icon: Package },
  { title: "Conciliação", url: "/op/conciliacao", icon: ArrowLeftRight },
  { title: "Aprovações", url: "/op/aprovacoes", icon: CheckCircle },
  { title: "Produtos", url: "/op/produtos", icon: Settings },
  { title: "Programadas", url: "/op/programadas", icon: Calendar },
];

interface AppSidebarProps {
  onClose?: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const { profile, user, signOut, loading } = useAuth();

  const displayName = profile?.name ?? user?.email ?? "Usuário";
  const role = (profile?.role as AppRole) ?? null;
  const allowedRoutes = role ? (ROLE_ROUTES[role] ?? []) : [];

  const financialItems = FINANCIAL_NAV.filter((i) => allowedRoutes.includes(i.url));
  const operationalItems = OPERATIONAL_NAV.filter((i) => allowedRoutes.includes(i.url));

  if (loading || !profile) {
    return (
      <aside className="flex h-screen w-60 flex-col border-r border-border bg-sidebar">
        <div className="flex h-14 items-center gap-2 border-b border-border px-5">
          <span className="text-lg font-semibold tracking-tight text-foreground">Comida y Amor</span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center justify-between border-b border-border px-5">
        <span className="text-lg font-semibold tracking-tight text-foreground">Comida y Amor</span>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground md:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {financialItems.length > 0 && (
          <>
            <p className="px-5 pt-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Gestão
            </p>
            <nav className="flex flex-col gap-0.5 px-3">
              {financialItems.map((item) => (
                <NavLink
                  key={item.url}
                  to={item.url}
                  end
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                  activeClassName="bg-sidebar-accent text-foreground"
                  onClick={onClose}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </NavLink>
              ))}
            </nav>
          </>
        )}

        {operationalItems.length > 0 && (
          <>
            <p className="px-5 pt-4 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Operacional
            </p>
            <nav className="flex flex-col gap-0.5 px-3">
              {operationalItems.map((item) => (
                <NavLink
                  key={item.url}
                  to={item.url}
                  end
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                  activeClassName="bg-sidebar-accent text-foreground"
                  onClick={onClose}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </NavLink>
              ))}
            </nav>
          </>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-2 truncate px-3 text-xs text-muted-foreground">{displayName}</div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
