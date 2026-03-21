import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleRoute } from "@/components/RoleRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

/* Financial / existing pages */
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DRE = lazy(() => import("./pages/DRE"));
const Produtos = lazy(() => import("./pages/Produtos"));
const ClientesB2B = lazy(() => import("./pages/ClientesB2B"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Compras = lazy(() => import("./pages/Compras"));
const ContasPagar = lazy(() => import("./pages/ContasPagar"));
const Producao = lazy(() => import("./pages/Producao"));
const FluxoCaixa = lazy(() => import("./pages/FluxoCaixa"));
const PortalB2B = lazy(() => import("./pages/PortalB2B"));
const MeusPedidos = lazy(() => import("./pages/MeusPedidos"));

/* Operational pages */
const ResumoOperacional = lazy(() => import("./pages/op/ResumoOperacional"));
const ProducaoDia = lazy(() => import("./pages/op/ProducaoDia"));
const EstoqueLoja = lazy(() => import("./pages/op/EstoqueLoja"));
const ConciliacaoOp = lazy(() => import("./pages/op/Conciliacao"));
const AprovacoesOp = lazy(() => import("./pages/op/Aprovacoes"));
const ProducoesProgamadas = lazy(() => import("./pages/op/ProducoesProgamadas"));
const Conselho = lazy(() => import("./pages/Conselho"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
  </div>
);

function SafePage({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-8">
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">Erro ao carregar página</p>
            <p className="mt-1 text-sm text-muted-foreground">Tente recarregar.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Recarregar
            </button>
          </div>
        </div>
      }
    >
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

function R({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleRoute path={path}>
        <SafePage>{children}</SafePage>
      </RoleRoute>
    </ProtectedRoute>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Financial */}
              <Route path="/" element={<R path="/"><Dashboard /></R>} />
              <Route path="/dre" element={<R path="/dre"><DRE /></R>} />
              <Route path="/contas-pagar" element={<R path="/contas-pagar"><ContasPagar /></R>} />
              <Route path="/fluxo-caixa" element={<R path="/fluxo-caixa"><FluxoCaixa /></R>} />
              <Route path="/produtos" element={<R path="/produtos"><Produtos /></R>} />
              <Route path="/clientes-b2b" element={<R path="/clientes-b2b"><ClientesB2B /></R>} />
              <Route path="/usuarios" element={<R path="/usuarios"><Usuarios /></R>} />
              <Route path="/compras" element={<R path="/compras"><Compras /></R>} />
              <Route path="/producao" element={<R path="/producao"><Producao /></R>} />
              <Route path="/b2b" element={<R path="/b2b"><PortalB2B /></R>} />
              <Route path="/b2b/pedidos" element={<R path="/b2b/pedidos"><MeusPedidos /></R>} />

              {/* Operational */}
              <Route path="/op" element={<R path="/op"><ResumoOperacional /></R>} />
              <Route path="/op/producao-dia" element={<R path="/op/producao-dia"><ProducaoDia /></R>} />
              <Route path="/op/estoque-loja" element={<R path="/op/estoque-loja"><EstoqueLoja /></R>} />
              <Route path="/op/conciliacao" element={<R path="/op/conciliacao"><ConciliacaoOp /></R>} />
              <Route path="/op/aprovacoes" element={<R path="/op/aprovacoes"><AprovacoesOp /></R>} />
              <Route path="/op/programadas" element={<R path="/op/programadas"><ProducoesProgamadas /></R>} />

              {/* Conselho — Strategic */}
              <Route path="/conselho" element={<R path="/conselho"><Conselho /></R>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
