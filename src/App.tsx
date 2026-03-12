import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleRoute } from "@/components/RoleRoute";
import Dashboard from "./pages/Dashboard";
import DRE from "./pages/DRE";
import Compras from "./pages/Compras";
import Producao from "./pages/Producao";
import PortalB2B from "./pages/PortalB2B";
import MeusPedidos from "./pages/MeusPedidos";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><RoleRoute path="/"><Dashboard /></RoleRoute></ProtectedRoute>} />
            <Route path="/dre" element={<ProtectedRoute><RoleRoute path="/dre"><DRE /></RoleRoute></ProtectedRoute>} />
            <Route path="/compras" element={<ProtectedRoute><RoleRoute path="/compras"><Compras /></RoleRoute></ProtectedRoute>} />
            <Route path="/producao" element={<ProtectedRoute><RoleRoute path="/producao"><Producao /></RoleRoute></ProtectedRoute>} />
            <Route path="/b2b" element={<ProtectedRoute><RoleRoute path="/b2b"><PortalB2B /></RoleRoute></ProtectedRoute>} />
            <Route path="/b2b/pedidos" element={<ProtectedRoute><RoleRoute path="/b2b/pedidos"><MeusPedidos /></RoleRoute></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
