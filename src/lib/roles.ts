export type AppRole = "admin" | "compras" | "producao" | "b2b_cliente";

export const ROLE_ROUTES: Record<AppRole, string[]> = {
  admin: ["/", "/dre", "/produtos", "/compras", "/producao", "/b2b", "/b2b/pedidos"],
  compras: ["/compras"],
  producao: ["/producao"],
  b2b_cliente: ["/b2b", "/b2b/pedidos"],
};

export const ROLE_DEFAULT_ROUTE: Record<AppRole, string> = {
  admin: "/",
  compras: "/compras",
  producao: "/producao",
  b2b_cliente: "/b2b",
};

export function canAccess(role: string, path: string): boolean {
  const routes = ROLE_ROUTES[role as AppRole];
  if (!routes) return false;
  return routes.includes(path);
}

export function getDefaultRoute(role: string): string {
  return ROLE_DEFAULT_ROUTE[role as AppRole] ?? "/";
}
