import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── B2B Companies ──

export function useB2BCompanies() {
  return useQuery({
    queryKey: ["b2b_companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("b2b_companies")
        .select("*")
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });
}

export function useB2BCompanyWithUsers() {
  return useQuery({
    queryKey: ["b2b_companies_with_users"],
    queryFn: async () => {
      const { data: companies, error: cErr } = await supabase
        .from("b2b_companies")
        .select("*")
        .order("company_name");
      if (cErr) throw cErr;

      const { data: users, error: uErr } = await supabase
        .from("users")
        .select("id, name, email, role, company_id, last_login_at");
      if (uErr) throw uErr;

      const { data: orders, error: oErr } = await supabase
        .from("b2b_orders")
        .select("id, company_id");
      if (oErr) throw oErr;

      const orderCounts: Record<string, number> = {};
      orders?.forEach((o) => {
        orderCounts[o.company_id] = (orderCounts[o.company_id] || 0) + 1;
      });

      return (companies ?? []).map((c) => {
        const linkedUser = users?.find((u) => u.company_id === c.id) ?? null;
        return {
          ...c,
          linkedUser,
          orderCount: orderCounts[c.id] || 0,
        };
      });
    },
  });
}

export function useCreateB2BCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { error } = await supabase.from("b2b_companies").insert(values as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["b2b_companies"] });
      qc.invalidateQueries({ queryKey: ["b2b_companies_with_users"] });
    },
  });
}

export function useUpdateB2BCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Record<string, unknown>) => {
      const { error } = await supabase.from("b2b_companies").update(values as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["b2b_companies"] });
      qc.invalidateQueries({ queryKey: ["b2b_companies_with_users"] });
    },
  });
}

// ── Users ──

export function useAllUsers() {
  return useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Record<string, unknown>) => {
      const { error } = await supabase.from("users").update(values as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_users"] });
      qc.invalidateQueries({ queryKey: ["b2b_companies_with_users"] });
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      email: string;
      password: string;
      name: string;
      role: string;
      user_group: string;
      company_id?: string;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_users"] });
      qc.invalidateQueries({ queryKey: ["b2b_companies_with_users"] });
    },
  });
}
