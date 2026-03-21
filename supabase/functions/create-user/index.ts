import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROLE_ALIASES: Record<string, string> = {
  admin: "admin",
  Admin: "admin",
  vendas: "vendas",
  Vendas: "vendas",
  producao: "producao",
  "Produção": "producao",
  financeiro: "financeiro",
  Financeiro: "financeiro",
  gestao: "gestao",
  "Gestão": "gestao",
  gerente_operacional: "gerente_operacional",
  "Gerente Operacional": "gerente_operacional",
  loja: "loja",
  Loja: "loja",
  compras: "compras",
  Compras: "compras",
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

const ALLOWED_ROLES = new Set([
  "admin",
  "gestao",
  "financeiro",
  "compras",
  "vendas",
  "producao",
  "gerente_operacional",
  "loja",
  "b2b_cliente",
  "cliente_b2c",
]);

const ALLOWED_GROUPS = new Set(["cya", "b2b", "b2c"]);

const normalizeRole = (value: unknown) => {
  if (typeof value !== "string") return "";
  return ROLE_ALIASES[value] ?? value;
};

const normalizeGroup = (value: unknown) => {
  if (typeof value !== "string") return "cya";
  return GROUP_ALIASES[value] ?? value;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: authHeader } },
      }
    );

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile, error: profileError } = await callerClient
      .from("users")
      .select("role, is_active")
      .eq("auth_user_id", caller.id)
      .single();

    if (profileError || callerProfile?.role !== "admin" || !callerProfile?.is_active) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores ativos podem criar usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const role = normalizeRole(body.role);
    const user_group = normalizeGroup(body.user_group);
    const company_id = typeof body.company_id === "string" && body.company_id.trim() ? body.company_id : null;
    const is_active = typeof body.is_active === "boolean" ? body.is_active : true;

    if (!email || !password || !name || !role) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: email, senha, nome, perfil" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ALLOWED_ROLES.has(role)) {
      return new Response(
        JSON.stringify({ error: `Perfil inválido: ${body.role}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ALLOWED_GROUPS.has(user_group)) {
      return new Response(
        JSON.stringify({ error: `Grupo inválido: ${body.user_group}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedCompanyId = ["b2b_cliente", "cliente_b2c"].includes(role) ? company_id : null;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        user_group,
      },
    });

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: authError?.message ?? "Erro ao criar usuário" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 400));

    const { error: deleteSeedError } = await adminClient
      .from("users")
      .delete()
      .eq("auth_user_id", authData.user.id);

    if (deleteSeedError) {
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return new Response(JSON.stringify({ error: deleteSeedError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: createdUser, error: insertError } = await adminClient
      .from("users")
      .insert({
        auth_user_id: authData.user.id,
        name,
        email,
        role,
        user_group,
        company_id: normalizedCompanyId,
        is_active,
      })
      .select("id, auth_user_id, role, user_group")
      .single();

    if (insertError) {
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, user_id: createdUser.auth_user_id, profile_id: createdUser.id, role: createdUser.role, user_group: createdUser.user_group }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
