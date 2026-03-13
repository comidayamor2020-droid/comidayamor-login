import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAllUsers, useUpdateUser, useB2BCompanies } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Search, Users } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  compras: "Compras",
  producao: "Produção",
  b2b_cliente: "Cliente B2B",
};

function formatLastAccess(dt: string | null) {
  if (!dt) return "Nunca acessou";
  return new Date(dt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Usuarios() {
  const { data: users, isLoading } = useAllUsers();
  const { data: companies } = useB2BCompanies();
  const updateUser = useUpdateUser();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({ role: "", is_active: true, company_id: "" });

  const openEdit = (u: any) => {
    setEditUser(u);
    setForm({
      role: u.role,
      is_active: u.is_active,
      company_id: u.company_id ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.role) {
      toast.error("Role é obrigatório.");
      return;
    }
    try {
      await updateUser.mutateAsync({
        id: editUser.id,
        role: form.role,
        is_active: form.is_active,
        company_id: form.role === "b2b_cliente" && form.company_id ? form.company_id : null,
      });
      toast.success("Usuário atualizado.");
      setDialogOpen(false);
    } catch {
      toast.error("Erro ao atualizar usuário.");
    }
  };

  const companyMap = new Map((companies ?? []).map((c) => [c.id, c.company_name]));

  const filtered = (users ?? []).filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Usuários</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gerencie funções, empresas e status de acesso</p>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar usuário..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        </div>
      ) : !filtered.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empresa Vinculada</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Último Acesso</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.is_active ? "default" : "destructive"}>
                      {u.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.company_id ? companyMap.get(u.company_id) ?? "—" : <span className="italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatLastAccess(u.last_login_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Editar Usuário
            </DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="grid gap-4 py-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <p className="text-sm font-medium text-foreground">{editUser.name}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="text-sm text-foreground">{editUser.email ?? "—"}</p>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                >
                  <option value="admin">Admin</option>
                  <option value="compras">Compras</option>
                  <option value="producao">Produção</option>
                  <option value="b2b_cliente">Cliente B2B</option>
                </select>
              </div>
              {form.role === "b2b_cliente" && (
                <div className="space-y-2">
                  <Label>Empresa B2B</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.company_id}
                    onChange={(e) => setForm((p) => ({ ...p, company_id: e.target.value }))}
                  >
                    <option value="">Selecione...</option>
                    {(companies ?? []).map((c) => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="rounded border-input"
                />
                <Label htmlFor="is_active">Usuário ativo</Label>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={updateUser.isPending}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
