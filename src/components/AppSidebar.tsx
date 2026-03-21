import { useState } from "react";
import {
  LayoutDashboard, FileText, LogOut, Package, Factory, Store,
  ClipboardList, ShoppingBag, Building2, Users as UsersIcon,
  BarChart3, Zap, ArrowLeftRight, CheckCircle, Calendar, X,
  ChevronDown, Users, TrendingUp, PieChart,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_ROUTES, type AppRole } from "@/lib/roles";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const STANDALONE: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
];

const GROUPS: NavGroup[] = [
  {
    label: "Financeiro",
    items: [
      { title: "DRE", url: "/dre", icon: FileText },
      { title: "Contas a Pagar", url: "/contas-pagar", icon: ClipboardList },
      { title: "Fluxo de Caixa", url: "/fluxo-caixa", icon: TrendingUp },
      { title: "Compras", url: "/compras", icon: Package },
      { title: "Produção", url: "/producao", icon: Factory },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { title: "Produtos", url: "/produtos", icon: ShoppingBag },
      { title: "Usuários", url: "/usuarios", icon: UsersIcon },
      { title: "Clientes B2B", url: "/clientes-b2b", icon: Building2 },
    ],
  },
  {
    label: "B2B",
    items: [
      { title: "Portal B2B", url: "/b2b", icon: Store },
      { title: "Meus Pedidos", url: "/b2b/pedidos", icon: ClipboardList },
    ],
  },
  {
    label: "Operacional",
    items: [
      { title: "Resumo Operacional", url: "/op", icon: BarChart3 },
      { title: "Produção do Dia", url: "/op/producao-dia", icon: Zap },
      { title: "Estoque da Loja", url: "/op/estoque-loja", icon: Package },
      { title: "Conciliação", url: "/op/conciliacao", icon: ArrowLeftRight },
      { title: "Aprovações", url: "/op/aprovacoes", icon: CheckCircle },
      { title: "Programadas", url: "/op/programadas", icon: Calendar },
    ],
  },
  {
    label: "Estratégico",
    items: [
      { title: "Conselho", url: "/conselho", icon: Users },
    ],
  },
];

interface AppSidebarProps {
  onClose?: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const { profile, user, signOut, loading } = useAuth();

  const displayName = profile?.name ?? user?.email ?? "Usuário";
  const role = (profile?.role as AppRole) ?? null;
  const allowedRoutes = role ? (ROLE_ROUTES[role] ?? []) : [];

  const filterItems = (items: NavItem[]) =>
    items.filter((i) => allowedRoutes.includes(i.url));

  const standaloneFiltered = filterItems(STANDALONE);
  const groupsFiltered = GROUPS
    .map((g) => ({ ...g, items: filterItems(g.items) }))
    .filter((g) => g.items.length > 0);

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
        {/* Standalone items (Dashboard) */}
        {standaloneFiltered.length > 0 && (
          <nav className="flex flex-col gap-0.5 px-3 pt-3">
            {standaloneFiltered.map((item) => (
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
        )}

        {/* Grouped items */}
        {groupsFiltered.map((group) => (
          <CollapsibleGroup key={group.label} label={group.label} items={group.items} onClose={onClose} />
        ))}
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

const STORAGE_KEY = "sidebar-groups-state";

function loadGroupStates(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveGroupState(label: string, open: boolean) {
  try {
    const states = loadGroupStates();
    states[label] = open;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch { /* noop */ }
}

function CollapsibleGroup({
  label,
  items,
  onClose,
}: {
  label: string;
  items: NavItem[];
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(() => {
    const saved = loadGroupStates();
    return saved[label] !== undefined ? saved[label] : true;
  });

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      saveGroupState(label, next);
      return next;
    });
  };

  return (
    <div className="mt-1">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between px-5 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{label}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <nav className="flex flex-col gap-0.5 px-3 pb-1">
          {items.map((item) => (
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
      )}
    </div>
  );
}
