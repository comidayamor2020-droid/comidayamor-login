import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAllUsers, useUpdateUser, useCreateUser, useB2BCompanies } from "@/hooks/use-admin";
import { useDeleteUser } from "@/hooks/use-delete-user";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Search, UserPlus, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", gestao: "Gestão", financeiro: "Financeiro", compras: "Compras",
  vendas: "Vendas", producao: "Produção", gerente_operacional: "Gerente Operacional",
  loja: "Loja", b2b_cliente: "Cliente B2B", cliente_b2c: "Cliente B2C",
};
const ALL_ROLES = Object.keys(ROLE_LABELS);
const GROUP_LABELS: Record<string, string> = { cya: "CyA", b2b: "B2B", b2c: "B2C" };

function formatLastAccess(dt: string | null) {
  if (!dt) return "Nunca acessou";
  return new Date(dt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Usuarios() {
  const { profile } = useAuth();
  const { data: users, isLoading } = useAllUsers();
  const { data: companies } = useB2BCompanies();
  const updateUser = useUpdateUser();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  const isMaster = profile?.role === "admin";

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("cya");
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ role: "", is_active: true, company_id: "", user_group: "cya" });
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "producao", user_group: "cya", company_id: "", is_active: true });
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const companyMap = new Map((companies ?? []).map((c) => [c.id, c.company_name]));

  const openEdit = (u: any) => {
    setEditUser(u);
    setEditForm({ role: u.role, is_active: u.is_active, company_id: u.company_id ?? "", user_group: (u as any).user_group ?? "cya" });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.role) { toast.error("Perfil é obrigatório."); return; }
    try {
      await updateUser.mutateAsync({
        id: editUser.id, role: editForm.role, is_active: editForm.is_active,
        company_id: ["b2b_cliente", "cliente_b2c"].includes(editForm.role) && editForm.company_id ? editForm.company_id : null,
        user_group: editForm.user_group,
      });
      toast.success("Usuário atualizado.");
      setEditOpen(false);
    } catch { toast.error("Erro ao atualizar usuário."); }
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.email || !createForm.password || !createForm.role) { toast.error("Preencha todos os campos obrigatórios."); return; }
    if (createForm.password.length < 6) { toast.error("Senha deve ter pelo menos 6 caracteres."); return; }
    try {
      await createUser.mutateAsync({
        name: createForm.name, email: createForm.email, password: createForm.password,
        role: createForm.role, user_group: createForm.user_group,
        company_id: ["b2b_cliente", "cliente_b2c"].includes(createForm.role) && createForm.company_id ? createForm.company_id : undefined,
        is_active: createForm.is_active,
      });
      toast.success("Usuário criado com sucesso!");
      setCreateOpen(false);
      setCreateForm({ name: "", email: "", password: "", role: "producao", user_group: "cya", company_id: "", is_active: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar usuário");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser.mutateAsync({ id: deleteTarget.id, name: deleteTarget.name, email: deleteTarget.email });
      toast.success("Usuário excluído.");
      setDeleteTarget(null);
    } catch { toast.error("Erro ao excluir usuário."); }
  };

  const filtered = (users ?? []).filter((u) => {
    const group = (u as any).user_group ?? "cya";
    if (group !== activeTab) return false;
    const q = search.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q);
  });

  const countByGroup = (group: string) => (users ?? []).filter((u) => ((u as any).user_group ?? "cya") === group).length;

  const renderTable = () => {
    if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" /></div>;
    if (!filtered.length) return <p className="py-8 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</p>;
    return (
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Perfil</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empresa</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Último Acesso</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                <td className="px-4 py-3"><Badge variant="secondary">{ROLE_LABELS[u.role] ?? u.role}</Badge></td>
                <td className="px-4 py-3"><Badge variant={u.is_active ? "default" : "destructive"}>{u.is_active ? "Ativo" : "Inativo"}</Badge></td>
                <td className="px-4 py-3 text-muted-foreground">{u.company_id ? companyMap.get(u.company_id) ?? "—" : <span className="italic">—</span>}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatLastAccess(u.last_login_at)}</td>
                <td className="px-4 py-3 flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                  {isMaster && u.id !== profile?.id && (
                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(u)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie perfis, empresas e status de acesso</p>
        </div>
        <Button onClick={() => { setCreateForm({ name: "", email: "", password: "", role: "producao", user_group: activeTab, company_id: "", is_active: true }); setCreateOpen(true); }}>
          <UserPlus className="mr-2 h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="cya">CyA ({countByGroup("cya")})</TabsTrigger>
          <TabsTrigger value="b2b">B2B ({countByGroup("b2b")})</TabsTrigger>
          <TabsTrigger value="b2c">B2C ({countByGroup("b2c")})</TabsTrigger>
        </TabsList>
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar usuário..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <TabsContent value="cya">{renderTable()}</TabsContent>
        <TabsContent value="b2b">{renderTable()}</TabsContent>
        <TabsContent value="b2c">{renderTable()}</TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
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
                <Label>Perfil</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm((p) => ({ ...p, role: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Grupo</Label>
                <Select value={editForm.user_group} onValueChange={(v) => setEditForm((p) => ({ ...p, user_group: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(GROUP_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {["b2b_cliente", "cliente_b2c"].includes(editForm.role) && (
                <div className="space-y-2">
                  <Label>Empresa Vinculada</Label>
                  <Select value={editForm.company_id} onValueChange={(v) => setEditForm((p) => ({ ...p, company_id: v }))}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{(companies ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Checkbox id="edit_is_active" checked={editForm.is_active} onCheckedChange={(c) => setEditForm((p) => ({ ...p, is_active: !!c }))} />
                <Label htmlFor="edit_is_active">Usuário ativo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateUser.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Nome *</Label><Input value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nome completo" /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" /></div>
            <div className="space-y-2"><Label>Senha provisória *</Label><Input type="password" value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} placeholder="Mín. 6 caracteres" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Perfil *</Label>
                <Select value={createForm.role} onValueChange={(v) => setCreateForm((p) => ({ ...p, role: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Grupo *</Label>
                <Select value={createForm.user_group} onValueChange={(v) => setCreateForm((p) => ({ ...p, user_group: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(GROUP_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {["b2b_cliente", "cliente_b2c"].includes(createForm.role) && (
              <div className="space-y-2"><Label>Empresa Vinculada</Label>
                <Select value={createForm.company_id} onValueChange={(v) => setCreateForm((p) => ({ ...p, company_id: v }))}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{(companies ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox id="create_is_active" checked={createForm.is_active} onCheckedChange={(c) => setCreateForm((p) => ({ ...p, is_active: !!c }))} />
              <Label htmlFor="create_is_active">Usuário ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createUser.isPending}>Criar Usuário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})?
              Esta ação é irreversível e será registrada no log de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
