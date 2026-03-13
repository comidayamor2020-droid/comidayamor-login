import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useMyOrders, useOrderItems } from "@/hooks/use-b2b";
import { formatBRL } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, ClipboardList, Truck } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  submitted: { label: "Enviado", variant: "default" },
  enviado: { label: "Enviado", variant: "default" },
  approved: { label: "Aprovado", variant: "default" },
  pedido_aceito: { label: "Pedido Aceito", variant: "outline" },
  in_production: { label: "Em Produção", variant: "outline" },
  em_producao: { label: "Em Produção", variant: "outline" },
  pedido_pronto: { label: "Pedido Pronto", variant: "default" },
  delivered: { label: "Entregue", variant: "secondary" },
  entregue: { label: "Entregue", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

function OrderItemsDetail({ orderId }: { orderId: string }) {
  const { data: items, isLoading } = useOrderItems(orderId);

  if (isLoading) return <div className="px-5 py-3 text-sm text-muted-foreground">Carregando itens...</div>;
  if (!items?.length) return <div className="px-5 py-3 text-sm text-muted-foreground">Nenhum item encontrado.</div>;

  return (
    <div className="border-t border-border bg-muted/20 px-5 py-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase text-muted-foreground">
            <th className="pb-2 text-left font-medium">Produto</th>
            <th className="pb-2 text-right font-medium">Qtd</th>
            <th className="pb-2 text-right font-medium">Preço Unit.</th>
            <th className="pb-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-border/50">
              <td className="py-2 text-foreground">{(item as any).produtos?.nome ?? "Produto"}</td>
              <td className="py-2 text-right tabular-nums text-foreground">{item.quantity}</td>
              <td className="py-2 text-right tabular-nums text-foreground">{formatBRL(item.unit_price)}</td>
              <td className="py-2 text-right tabular-nums font-medium text-foreground">{formatBRL(item.total_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MeusPedidos() {
  const { data: orders, isLoading } = useMyOrders();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Meus Pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Histórico de pedidos B2B</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        </div>
      ) : !orders?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center shadow-sm">
          <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-lg font-medium text-foreground">Nenhum pedido encontrado</h2>
          <p className="mt-2 text-sm text-muted-foreground">Seus pedidos aparecerão aqui após criá-los no Portal B2B.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const status = STATUS_LABELS[order.status] ?? { label: order.status, variant: "outline" as const };
            const isExpanded = expandedId === order.id;

            return (
              <div key={order.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/30"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-foreground">Pedido #{order.id.slice(0, 8)}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {order.order_date ? new Date(order.order_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground">{formatBRL(order.total_amount)}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {order.notes && (
                  <div className="border-t border-border/50 px-5 py-2">
                    <p className="text-xs text-muted-foreground"><span className="font-medium">Obs:</span> {order.notes}</p>
                  </div>
                )}

                {order.estimated_delivery_date && (
                  <div className="border-t border-border/50 px-5 py-2">
                    <p className="flex items-center gap-1.5 text-sm text-foreground">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      Data prevista: {new Date(order.estimated_delivery_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      {order.estimated_delivery_start && order.estimated_delivery_end && (
                        <span className="ml-1 text-muted-foreground">
                          — Janela: {order.estimated_delivery_start.slice(0, 5)} às {order.estimated_delivery_end.slice(0, 5)}
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {isExpanded && <OrderItemsDetail orderId={order.id} />}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
