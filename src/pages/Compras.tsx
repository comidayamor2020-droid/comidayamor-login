import { DashboardLayout } from "@/components/DashboardLayout";
import { Package } from "lucide-react";

export default function Compras() {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Compras</h1>
        <p className="mt-1 text-sm text-muted-foreground">Painel de gestão de compras</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center shadow-sm">
        <Package className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-lg font-medium text-foreground">Em breve</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          O painel de compras será expandido em breve com gestão de fornecedores, pedidos de compra e controle de estoque.
        </p>
      </div>
    </DashboardLayout>
  );
}
