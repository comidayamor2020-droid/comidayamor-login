import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Trash2, UserPlus, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatTelefone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

interface ClienteB2C {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  created_at: string;
}

export default function ClientesB2C() {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [errors, setErrors] = useState<{ email?: string; telefone?: string; nome?: string }>({});
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ClienteB2C | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: clientes, isLoading } = useQuery({
    queryKey: ["clientes_b2c"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes_b2c" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ClienteB2C[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { nome: string; email: string; telefone: string }) => {
      const { error } = await supabase.from("clientes_b2c" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes_b2c"] });
      setNome(""); setEmail(""); setTelefone(""); setErrors({});
      toast.success("Cliente cadastrado com sucesso!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes_b2c" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes_b2c"] });
      toast.success("Cliente excluído.");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Erro ao excluir cliente."),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!nome.trim()) newErrors.nome = "Nome é obrigatório.";
    if (!email.trim()) newErrors.email = "E-mail é obrigatório.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "E-mail inválido.";
    const telDigits = telefone.replace(/\D/g, "");
    if (telDigits.length < 10) newErrors.telefone = "Telefone inválido.";

    if (!Object.keys(newErrors).length) {
      const emailLower = email.trim().toLowerCase();
      const existing = clientes ?? [];
      if (existing.some((c) => c.email.toLowerCase() === emailLower)) {
        newErrors.email = "Este e-mail já está cadastrado.";
      }
      if (existing.some((c) => c.telefone.replace(/\D/g, "") === telDigits)) {
        newErrors.telefone = "Este telefone já está cadastrado.";
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    try {
      await createMutation.mutateAsync({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        telefone: formatTelefone(telefone),
      });
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("clientes_b2c_email_key")) setErrors({ email: "Este e-mail já está cadastrado." });
      else if (msg.includes("clientes_b2c_telefone_key")) setErrors({ telefone: "Este telefone já está cadastrado." });
      else toast.error("Erro ao cadastrar cliente.");
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clientes ?? [];
    return (clientes ?? []).filter(
      (c) => c.nome.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    );
  }, [clientes, search]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Clientes B2C</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cadastro de clientes pessoa física</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5 text-primary" /> Novo cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => { setNome(e.target.value); setErrors((p) => ({ ...p, nome: undefined })); }}
                placeholder="Nome completo"
              />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                placeholder="email@exemplo.com"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => { setTelefone(formatTelefone(e.target.value)); setErrors((p) => ({ ...p, telefone: undefined })); }}
                placeholder="(11) 99999-9999"
                maxLength={15}
              />
              {errors.telefone && <p className="text-xs text-destructive">{errors.telefone}</p>}
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Cadastrando..." : "Cadastrar Cliente"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Clientes cadastrados ({clientes?.length ?? 0})</CardTitle>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
            </div>
          ) : !filtered.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                  </tr>
                </thead>
                {filtered.map((c) => {
                  const isOpen = expandedId === c.id;
                  return (
                    <tbody key={c.id}>
                      <tr
                        className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setExpandedId(isOpen ? null : c.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground transition-colors duration-200 hover:text-[#A76141]">
                              {c.nome}
                            </span>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform duration-300 ease-out",
                                isOpen && "rotate-180"
                              )}
                            />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-0">
                          <div
                            className={cn(
                              "overflow-hidden transition-all duration-300 ease-out",
                              isOpen ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
                            )}
                          >
                            <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-3">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">E-mail</p>
                                <p className="text-sm text-foreground">{c.email}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Telefone</p>
                                <p className="text-sm text-foreground">{c.telefone}</p>
                              </div>
                              <div className="flex items-end justify-between">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">Data de cadastro</p>
                                  <p className="text-sm text-foreground">
                                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                                  </p>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget(c);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  );
                })}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>? Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
