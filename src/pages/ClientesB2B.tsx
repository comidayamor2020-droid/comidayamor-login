import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useB2BCompanyWithUsers, useCreateB2BCompany, useUpdateB2BCompany } from "@/hooks/use-admin";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Plus, Pencil, Search } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  active: "Ativo",
  inactive: "Inativo",
};

const statusColor = (s: string | null) => {
  if (s === "active") return "default" as const;
  if (s === "inactive") return "destructive" as const;
  return "secondary" as const;
};

const TIPO_MINIMO_LABELS: Record<string, string> = {
  sem_minimo: "Sem mínimo",
  valor: "Valor",
  itens: "Qtd. itens",
  valor_e_itens: "Valor + Itens",
};

const EMPTY_FORM = {
  company_name: "",
  trade_name: "",
  cnpj: "",
  contact_name: "",
  email: "",
  phone: "",
  whatsapp: "",
  instagram: "",
  city: "",
  state: "",
  status: "lead",
  score: "",
  tipo_pedido_minimo: "sem_minimo",
  pedido_minimo_valor: "0",
  pedido_minimo_itens: "0",
  notes: "",
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

export default function ClientesB2B() {
  const { data: companies, isLoading } = useB2BCompanyWithUsers();
  const createCompany = useCreateB2BCompany();
  const updateCompany = useUpdateB2BCompany();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      company_name: c.company_name ?? "",
      trade_name: c.trade_name ?? "",
      cnpj: c.cnpj ?? "",
      contact_name: c.contact_name ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      whatsapp: c.whatsapp ?? "",
      instagram: c.instagram ?? "",
      city: c.city ?? "",
      state: c.state ?? "",
      status: c.status ?? "lead",
      score: c.score?.toString() ?? "",
      tipo_pedido_minimo: c.tipo_pedido_minimo ?? "sem_minimo",
      pedido_minimo_valor: c.pedido_minimo_valor?.toString() ?? "0",
      pedido_minimo_itens: c.pedido_minimo_itens?.toString() ?? "0",
      notes: c.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.company_name.trim()) {
      toast.error("Nome da empresa é obrigatório.");
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("E-mail inválido.");
      return;
    }
    const payload: Record<string, unknown> = {
      company_name: form.company_name,
      trade_name: form.trade_name || null,
      cnpj: form.cnpj || null,
      contact_name: form.contact_name || null,
      email: form.email || null,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      instagram: form.instagram || null,
      city: form.city || null,
      state: form.state || null,
      status: form.status || "lead",
      score: form.score ? parseFloat(form.score) : 0,
      tipo_pedido_minimo: form.tipo_pedido_minimo || "sem_minimo",
      pedido_minimo_valor: form.pedido_minimo_valor ? parseFloat(form.pedido_minimo_valor) : 0,
      pedido_minimo_itens: form.pedido_minimo_itens ? parseInt(form.pedido_minimo_itens) : 0,
      notes: form.notes || null,
    };

    try {
      if (editId) {
        await updateCompany.mutateAsync({ id: editId, ...payload });
        toast.success("Empresa atualizada.");
      } else {
        await createCompany.mutateAsync(payload);
        toast.success("Empresa criada.");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Erro ao salvar empresa.");
    }
  };

  const filtered = (companies ?? []).filter((c) => {
    const q = search.toLowerCase();
    return (
      c.company_name?.toLowerCase().includes(q) ||
      c.trade_name?.toLowerCase().includes(q) ||
      c.contact_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q)
    );
  });

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Clientes B2B</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie empresas e clientes B2B</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nova Empresa
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        </div>
      ) : !filtered.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empresa</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contato</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cidade/Estado</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pedido Mín.</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pedidos</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuário</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Último Acesso</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{c.company_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.contact_name || "—"}
                    {c.email && <span className="block text-xs">{c.email}</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {[c.city, c.state].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {(c.tipo_pedido_minimo ?? "sem_minimo") === "sem_minimo" ? (
                      "Sem mínimo"
                    ) : (c.tipo_pedido_minimo === "valor") ? (
                      formatBRL(c.pedido_minimo_valor ?? 0)
                    ) : (c.tipo_pedido_minimo === "itens") ? (
                      `${c.pedido_minimo_itens ?? 0} itens`
                    ) : (
                      <>{formatBRL(c.pedido_minimo_valor ?? 0)} / {c.pedido_minimo_itens ?? 0} itens</>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusColor(c.status)}>{STATUS_LABELS[c.status ?? "lead"] ?? c.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.orderCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.linkedUser ? (
                      <span className="text-xs">{c.linkedUser.name ?? c.linkedUser.email}</span>
                    ) : (
                      <span className="text-xs italic">Sem usuário vinculado</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatLastAccess(c.linkedUser?.last_login_at ?? null)}
                  </td>
                  <td className="px-4 py-3">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {editId ? "Editar Empresa" : "Nova Empresa"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Razão Social *</Label>
                <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nome Fantasia</Label>
                <Input value={form.trade_name} onChange={(e) => set("trade_name", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contato</Label>
                <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  <option value="lead">Lead</option>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Score</Label>
                <Input type="number" value={form.score} onChange={(e) => set("score", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo Pedido Mínimo</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.tipo_pedido_minimo}
                onChange={(e) => set("tipo_pedido_minimo", e.target.value)}
              >
                <option value="sem_minimo">Sem mínimo</option>
                <option value="valor">Mínimo por valor</option>
                <option value="itens">Mínimo por quantidade de itens</option>
                <option value="valor_e_itens">Mínimo por valor e quantidade de itens</option>
              </select>
            </div>
            {(form.tipo_pedido_minimo === "valor" || form.tipo_pedido_minimo === "valor_e_itens") && (
              <div className="space-y-2">
                <Label>Pedido Mínimo (R$)</Label>
                <Input type="number" min="0" value={form.pedido_minimo_valor} onChange={(e) => set("pedido_minimo_valor", e.target.value)} />
              </div>
            )}
            {(form.tipo_pedido_minimo === "itens" || form.tipo_pedido_minimo === "valor_e_itens") && (
              <div className="space-y-2">
                <Label>Quantidade Mínima de Itens</Label>
                <Input type="number" min="0" value={form.pedido_minimo_itens} onChange={(e) => set("pedido_minimo_itens", e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createCompany.isPending || updateCompany.isPending}>
              {editId ? "Salvar" : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
