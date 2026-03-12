import { LayoutDashboard, FileText, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "DRE", url: "/dre", icon: FileText },
];

export function AppSidebar() {
  const { profile, user, signOut } = useAuth();

  const displayName = profile?.name ?? user?.email ?? "Usuário";

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
