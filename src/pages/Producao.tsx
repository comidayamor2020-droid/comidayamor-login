import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useProductionOrders, useProductionOrderItems, useUpdateOrderStatus } from "@/hooks/use-production";
import { formatBRL } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Factory, ChevronDown, ChevronUp, Truck, Clock, CheckCircle2, XCircle, Package } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon?: any }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  submitted: { label: "Enviado", variant: "default" },
  enviado: { label: "Enviado", variant: "default" },
  pedido_aceito: { label: "Aceito", variant: "outline", icon: CheckCircle2 },
  em_producao: { label: "Em Produção", variant: "default", icon: Factory },
  pedido_pronto: { label: "Pronto", variant: "outline", icon: Package },
  entregue: { label: "Entregue", variant: "secondary", icon: Truck },
  cancelado: { label: "Cancelado", variant: "destructive", icon: XCircle },
};

const STATUS_FLOW = ["enviado", "pedido_aceito", "em_producao", "pedido_pronto", "entregue"];

function normalizeStatus(s: string) {
  if (s === "submitted") return "enviado";
  return s;
}

function getNextStatuses(current: string): string[] {
  const norm = normalizeStatus(current);
  const idx = STATUS_FLOW.indexOf(norm);
  if (idx === -1) return STATUS_FLOW;
  const next = STATUS_FLOW.slice(idx + 1);
  return [...next, "cancelado"];
}

function OrderItems({ orderId }: { orderId: string }) {
  const { data: items, isLoading } = useProductionOrderItems(orderId);
  if (isLoading) return <p className="px-5 py-3 text-sm text-muted-foreground">Carregando...</p>;
  if (!items?.length) return <p className="px-5 py-3 text-sm text-muted-foreground">Sem itens.</p>;

  return (
    <div className="border-t border-border bg-muted/20 px-5 py-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase text-muted-foreground">
            <th className="pb-2 text-left font-medium">Produto</th>
            <th className="pb-2 text-right font-medium">Qtd</th>
            <th className="pb-2 text-right font-medium">Unit.</th>
            <th className="pb-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-border/50">
              <td className="py-2 text-foreground">{(item as any).produtos?.nome ?? "Produto"}</td>
              <td className="py-2 text-right tabular-nums">{item.quantity}</td>
              <td className="py-2 text-right tabular-nums">{formatBRL(item.unit_price)}</td>
              <td className="py-2 text-right tabular-nums font-medium">{formatBRL(item.total_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Producao() {
  const { data: orders, isLoading } = useProductionOrders();
  const updateStatus = useUpdateOrderStatus();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusDialog, setStatusDialog] = useState<{ orderId: string; currentStatus: string } | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryStart, setDeliveryStart] = useState("");
  const [deliveryEnd, setDeliveryEnd] = useState("");

  const counts = {
    enviado: 0,
    pedido_aceito: 0,
    em_producao: 0,
    pedido_pronto: 0,
  };
  orders?.forEach((o) => {
    const s = normalizeStatus(o.status);
    if (s in counts) counts[s as keyof typeof counts]++;
  });

  const summaryCards = [
    { label: "Enviados", count: counts.enviado, icon: Clock },
    { label: "Aceitos", count: counts.pedido_aceito, icon: CheckCircle2 },
    { label: "Em Produção", count: counts.em_producao, icon: Factory },
    { label: "Prontos", count: counts.pedido_pronto, icon: Package },
  ];

  const openStatusDialog = (orderId: string, currentStatus: string) => {
    setStatusDialog({ orderId, currentStatus });
    setNewStatus("");
    setDeliveryDate("");
    setDeliveryStart("");
    setDeliveryEnd("");
  };

  const handleStatusUpdate = () => {
    if (!statusDialog || !newStatus) return;
    if (newStatus === "pedido_pronto" && (!deliveryDate || !deliveryStart || !deliveryEnd)) {
      toast.error("Preencha a previsão de entrega para marcar como pronto.");
      return;
    }
    updateStatus.mutate(
      {
        orderId: statusDialog.orderId,
        status: newStatus,
        estimated_delivery_date: deliveryDate || undefined,
        estimated_delivery_start: deliveryStart || undefined,
        estimated_delivery_end: deliveryEnd || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Status atualizado!");
          setStatusDialog(null);
        },
        onError: () => toast.error("Erro ao atualizar status."),
      }
    );
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Produção</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gerencie pedidos B2B e atualize status de produção</p>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c) => (
          <div key={c.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <c.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-foreground">{c.count}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        </div>
      ) : !orders?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center shadow-sm">
          <Factory className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-lg font-medium text-foreground">Nenhum pedido encontrado</h2>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const norm = normalizeStatus(order.status);
            const cfg = STATUS_CONFIG[norm] ?? { label: order.status, variant: "outline" as const };
            const company = (order as any).b2b_companies;
            const isExpanded = expandedId === order.id;

            return (
              <div key={order.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/30"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-foreground">#{order.id.slice(0, 8)}</span>
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    {company?.company_name && (
                      <span className="text-sm text-muted-foreground">{company.company_name}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {order.order_date ? new Date(order.order_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground">{formatBRL(order.total_amount)}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <>
                    <div className="border-t border-border px-5 py-3 text-sm">
                      <div className="flex flex-wrap gap-x-8 gap-y-2 text-muted-foreground">
                        {company?.contact_name && <span>Contato: {company.contact_name}</span>}
                        {company?.phone && <span>Tel: {company.phone}</span>}
                        {company?.whatsapp && <span>WhatsApp: {company.whatsapp}</span>}
                        {company?.email && <span>Email: {company.email}</span>}
                      </div>
                      {order.notes && <p className="mt-2 text-muted-foreground"><span className="font-medium">Obs:</span> {order.notes}</p>}
                      {order.estimated_delivery_date && (
                        <p className="mt-2 text-foreground">
                          <Truck className="mr-1 inline h-4 w-4" />
                          Entrega: {new Date(order.estimated_delivery_date + "T00:00:00").toLocaleDateString("pt-BR")}
                          {order.estimated_delivery_start && order.estimated_delivery_end && (
                            <span className="ml-2 text-muted-foreground">{order.estimated_delivery_start.slice(0, 5)} às {order.estimated_delivery_end.slice(0, 5)}</span>
                          )}
                        </p>
                      )}
                      <div className="mt-3">
                        <Button size="sm" variant="outline" onClick={() => openStatusDialog(order.id, order.status)}>
                          Atualizar Status
                        </Button>
                      </div>
                    </div>
                    <OrderItems orderId={order.id} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!statusDialog} onOpenChange={(v) => !v && setStatusDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atualizar Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Novo Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {statusDialog && getNextStatuses(statusDialog.currentStatus).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newStatus === "pedido_pronto" && (
              <>
                <div>
                  <Label>Data de Entrega *</Label>
                  <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Horário Início *</Label>
                    <Input type="time" value={deliveryStart} onChange={(e) => setDeliveryStart(e.target.value)} />
                  </div>
                  <div>
                    <Label>Horário Fim *</Label>
                    <Input type="time" value={deliveryEnd} onChange={(e) => setDeliveryEnd(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <Button className="w-full" onClick={handleStatusUpdate} disabled={!newStatus || updateStatus.isPending}>
              {updateStatus.isPending ? "Atualizando..." : "Confirmar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
