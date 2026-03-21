import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ROLE_ALIASES: Record<string, string> = {
  admin: "admin",
  Admin: "admin",
  gestao: "gestao",
  "Gestão": "gestao",
  financeiro: "financeiro",
  Financeiro: "financeiro",
  compras: "compras",
  Compras: "compras",
  vendas: "vendas",
  Vendas: "vendas",
  producao: "producao",
  "Produção": "producao",
  gerente_operacional: "gerente_operacional",
  "Gerente Operacional": "gerente_operacional",
  loja: "loja",
  Loja: "loja",
  cliente_b2b: "b2b_cliente",
  b2b_cliente: "b2b_cliente",
  "Cliente B2B": "b2b_cliente",
  cliente_b2c: "cliente_b2c",
  "Cliente B2C": "cliente_b2c",
};

const GROUP_ALIASES: Record<string, string> = {
  cya: "cya",
  CyA: "cya",
  b2b: "b2b",
  B2B: "b2b",
  b2c: "b2c",
  B2C: "b2c",
};

const normalizeRole = (value?: string) => {
  if (!value) return value;
  return ROLE_ALIASES[value] ?? value;
};

const normalizeGroup = (value?: string) => {
  if (!value) return "cya";
  return GROUP_ALIASES[value] ?? value;
};

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
        .select("id, name, email, role, company_id, last_login_at")
        .order("name");
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
    mutationFn: async ({ id, role, user_group, company_id, ...values }: { id: string } & Record<string, unknown>) => {
      const normalizedRole = normalizeRole(role as string | undefined);
      const normalizedGroup = normalizeGroup(user_group as string | undefined);
      const normalizedCompanyId = ["b2b_cliente", "cliente_b2c"].includes(normalizedRole ?? "")
        ? (company_id as string | null | undefined) ?? null
        : null;

      const { error } = await supabase
        .from("users")
        .update({
          ...values,
          role: normalizedRole,
          user_group: normalizedGroup,
          company_id: normalizedCompanyId,
        } as any)
        .eq("id", id);
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
      const normalizedRole = normalizeRole(input.role);
      const normalizedGroup = normalizeGroup(input.user_group);
      const normalizedCompanyId = ["b2b_cliente", "cliente_b2c"].includes(normalizedRole ?? "")
        ? input.company_id
        : undefined;

      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          ...input,
          role: normalizedRole,
          user_group: normalizedGroup,
          company_id: normalizedCompanyId,
        },
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
