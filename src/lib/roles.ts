export type AppRole = "admin" | "gestao" | "gerente_operacional" | "loja" | "producao" | "compras" | "b2b_cliente";

export const ROLE_ROUTES: Record<AppRole, string[]> = {
  admin: [
    "/", "/dre", "/contas-pagar", "/fluxo-caixa", "/produtos", "/clientes-b2b", "/usuarios", "/compras", "/producao", "/b2b", "/b2b/pedidos",
    "/op", "/op/producao-dia", "/op/estoque-loja", "/op/conciliacao", "/op/aprovacoes", "/op/programadas",
    "/conselho",
  ],
  gestao: [
    "/", "/dre", "/contas-pagar", "/fluxo-caixa", "/produtos", "/clientes-b2b", "/usuarios", "/compras", "/producao", "/b2b", "/b2b/pedidos",
    "/op", "/op/producao-dia", "/op/estoque-loja", "/op/conciliacao", "/op/aprovacoes", "/op/programadas",
    "/conselho",
  ],
  gerente_operacional: [
    "/op", "/op/producao-dia", "/op/estoque-loja", "/op/conciliacao", "/op/aprovacoes", "/op/programadas",
  ],
  loja: ["/op/estoque-loja"],
  producao: ["/op/producao-dia"],
  compras: ["/compras"],
  b2b_cliente: ["/b2b", "/b2b/pedidos"],
};

export const ROLE_DEFAULT_ROUTE: Record<AppRole, string> = {
  admin: "/",
  gestao: "/",
  gerente_operacional: "/op",
  loja: "/op/estoque-loja",
  producao: "/op/producao-dia",
  compras: "/compras",
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
