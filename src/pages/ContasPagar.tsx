import { Navigate } from "react-router-dom";

// Página antiga consolidada: Contas a Pagar agora é a aba "Saídas" do Fluxo de Caixa
export default function ContasPagar() {
  return <Navigate to="/fluxo-caixa" replace />;
}
