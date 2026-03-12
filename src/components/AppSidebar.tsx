import { LayoutDashboard, FileText, LogOut, Package, Factory, Store, ClipboardList } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_ROUTES, type AppRole } from "@/lib/roles";

const ALL_NAV_ITEMS = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "DRE", url: "/dre", icon: FileText },
  { title: "Compras", url: "/compras", icon: Package },
  { title: "Produção", url: "/producao", icon: Factory },
  { title: "Portal B2B", url: "/b2b", icon: Store },
  { title: "Meus Pedidos", url: "/b2b/pedidos", icon: ClipboardList },
];

export function AppSidebar() {
  const { profile, user, signOut } = useAuth();

  const displayName = profile?.name ?? user?.email ?? "Usuário";
  const role = (profile?.role ?? "b2b_cliente") as AppRole;
  const allowedRoutes = ROLE_ROUTES[role] ?? [];
  const navItems = ALL_NAV_ITEMS.filter((item) => allowedRoutes.includes(item.url));

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Comida y Amor
        </span>
      </div>
      <p className="px-5 pt-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Gestão
      </p>
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
            activeClassName="bg-sidebar-accent text-foreground"
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 truncate px-3 text-xs text-muted-foreground">
          {displayName}
        </div>
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
