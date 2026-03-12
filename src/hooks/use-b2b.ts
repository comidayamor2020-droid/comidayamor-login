import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useProducts() {
  return useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useUserCompany() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["user-company", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      // Get company_id from user profile via a direct query
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("company_id")
        .eq("id", profile!.id)
        .maybeSingle();
      if (userError) throw userError;
      if (!userData?.company_id) return null;

      const { data, error } = await supabase
        .from("b2b_companies")
        .select("*")
        .eq("id", userData.company_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export interface CartItem {
  product_id: string;
  nome: string;
  unit_price: number;
  quantity: number;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      items,
      notes,
      companyId,
    }: {
      items: CartItem[];
      notes: string;
      companyId: string;
    }) => {
      // Get the user's internal id for user_id field
      const userId = profile?.id;
      const totalAmount = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

      const { data: order, error: orderError } = await supabase
        .from("b2b_orders")
        .insert({
          company_id: companyId,
          user_id: userId ?? null,
          status: "submitted",
          order_date: new Date().toISOString().split("T")[0],
          total_amount: totalAmount,
          notes: notes || null,
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("b2b_order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b-orders"] });
    },
  });
}

export function useMyOrders() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["b2b-orders", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      // First get company_id
      const { data: userData } = await supabase
        .from("users")
        .select("company_id")
        .eq("id", profile!.id)
        .maybeSingle();

      if (!userData?.company_id) return [];

      const { data, error } = await supabase
        .from("b2b_orders")
        .select("*")
        .eq("company_id", userData.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useOrderItems(orderId: string | null) {
  return useQuery({
    queryKey: ["b2b-order-items", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("b2b_order_items")
        .select("*, produtos(nome)")
        .eq("order_id", orderId!);
      if (error) throw error;
      return data;
    },
  });
}
