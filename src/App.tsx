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

const Dashboard = lazy(() => import("./pages/Dashboard"));
const DRE = lazy(() => import("./pages/DRE"));
const Produtos = lazy(() => import("./pages/Produtos"));
const ClientesB2B = lazy(() => import("./pages/ClientesB2B"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Compras = lazy(() => import("./pages/Compras"));
const Producao = lazy(() => import("./pages/Producao"));
const PortalB2B = lazy(() => import("./pages/PortalB2B"));
const MeusPedidos = lazy(() => import("./pages/MeusPedidos"));

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
            <button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
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
              <Route path="/" element={<ProtectedRoute><RoleRoute path="/"><SafePage><Dashboard /></SafePage></RoleRoute></ProtectedRoute>} />
              <Route path="/dre" element={<ProtectedRoute><RoleRoute path="/dre"><SafePage><DRE /></SafePage></RoleRoute></ProtectedRoute>} />
              <Route path="/produtos" element={<ProtectedRoute><RoleRoute path="/produtos"><SafePage><Produtos /></SafePage></RoleRoute></ProtectedRoute>} />
              <Route path="/clientes-b2b" element={<ProtectedRoute><RoleRoute path="/clientes-b2b"><SafePage><ClientesB2B /></SafePage></RoleRoute></ProtectedRoute>} />
              <Route path="/usuarios" element={<ProtectedRoute><RoleRoute path="/usuarios"><SafePage><Usuarios /></SafePage></RoleRoute></ProtectedRoute>} />
              <Route path="/compras" element={<ProtectedRoute><RoleRoute path="/compras"><SafePage><Compras /></SafePage></RoleRoute></ProtectedRoute>} />
              <Route path="/producao" element={<ProtectedRoute><RoleRoute path="/producao"><SafePage><Producao /></SafePage></RoleRoute></ProtectedRoute>} />
              <Route path="/b2b" element={<ProtectedRoute><RoleRoute path="/b2b"><SafePage><PortalB2B /></SafePage></RoleRoute></ProtectedRoute>} />
              <Route path="/b2b/pedidos" element={<ProtectedRoute><RoleRoute path="/b2b/pedidos"><SafePage><MeusPedidos /></SafePage></RoleRoute></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
