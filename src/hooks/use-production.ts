import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProductionOrders() {
  return useQuery({
    queryKey: ["production-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("b2b_orders")
        .select("*, b2b_companies(company_name, contact_name, phone, email, whatsapp)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useProductionOrderItems(orderId: string | null) {
  return useQuery({
    queryKey: ["production-order-items", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("b2b_order_items")
        .select("*, produtos(nome, imagem_url)")
        .eq("order_id", orderId!);
      if (error) throw error;
      return data;
    },
  });
}

interface StatusUpdatePayload {
  orderId: string;
  status: string;
  estimated_delivery_date?: string;
  estimated_delivery_start?: string;
  estimated_delivery_end?: string;
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status, estimated_delivery_date, estimated_delivery_start, estimated_delivery_end }: StatusUpdatePayload) => {
      const now = new Date().toISOString();

      const timestamps: Partial<{
        accepted_at: string;
        production_started_at: string;
        ready_at: string;
        estimated_delivery_date: string;
        estimated_delivery_start: string;
        estimated_delivery_end: string;
        delivered_at: string;
        cancelled_at: string;
      }> = {};

      switch (status) {
        case "pedido_aceito":
          timestamps.accepted_at = now;
          break;
        case "em_producao":
          timestamps.production_started_at = now;
          break;
        case "pedido_pronto":
          timestamps.ready_at = now;
          timestamps.estimated_delivery_date = estimated_delivery_date;
          timestamps.estimated_delivery_start = estimated_delivery_start;
          timestamps.estimated_delivery_end = estimated_delivery_end;
          break;
        case "entregue":
          timestamps.delivered_at = now;
          break;
        case "cancelado":
          timestamps.cancelled_at = now;
          break;
      }

      const { error } = await supabase.from("b2b_orders").update({ status, ...timestamps }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      queryClient.invalidateQueries({ queryKey: ["b2b-orders"] });
    },
  });
}
