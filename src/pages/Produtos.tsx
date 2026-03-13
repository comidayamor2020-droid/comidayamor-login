import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, ImageIcon } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface ProductForm {
  nome: string;
  categoria: string;
  preco_venda: string;
  custo_estimado: string;
  imagem_url: string;
  pedido_minimo: string;
  ativo: boolean;
}

const EMPTY_FORM: ProductForm = {
  nome: "",
  categoria: "",
  preco_venda: "",
  custo_estimado: "",
  imagem_url: "",
  pedido_minimo: "1",
  ativo: true,
};

function useAllProducts() {
  return useQuery({
    queryKey: ["admin-produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export default function Produtos() {
  const queryClient = useQueryClient();
  const { data: products, isLoading } = useAllProducts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const upsert = useMutation({
    mutationFn: async () => {
      const errs: Record<string, string> = {};
      if (!form.nome.trim()) errs.nome = "Nome é obrigatório";
      const pv = parseFloat(form.preco_venda);
      if (form.preco_venda && (isNaN(pv) || pv < 0)) errs.preco_venda = "Valor inválido";
      const ce = parseFloat(form.custo_estimado);
      if (form.custo_estimado && (isNaN(ce) || ce < 0)) errs.custo_estimado = "Valor inválido";
      const pm = parseFloat(form.pedido_minimo);
      if (isNaN(pm) || pm <= 0) errs.pedido_minimo = "Deve ser maior que 0";
      if (Object.keys(errs).length) {
        setErrors(errs);
        throw new Error("Validação falhou");
      }
      setErrors({});

      const payload = {
        nome: form.nome.trim(),
        categoria: form.categoria.trim() || null,
        preco_venda: form.preco_venda ? pv : null,
        custo_estimado: form.custo_estimado ? ce : null,
        imagem_url: form.imagem_url.trim() || null,
        pedido_minimo: pm,
        ativo: form.ativo,
      };

      if (editingId) {
        const { error } = await supabase.from("produtos").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("produtos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-produtos"] });
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success(editingId ? "Produto atualizado!" : "Produto criado!");
      setDialogOpen(false);
    },
    onError: (e) => {
      if (e.message !== "Validação falhou") toast.error("Erro ao salvar produto.");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("produtos").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-produtos"] });
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      nome: p.nome ?? "",
      categoria: p.categoria ?? "",
      preco_venda: p.preco_venda?.toString() ?? "",
      custo_estimado: p.custo_estimado?.toString() ?? "",
      imagem_url: p.imagem_url ?? "",
      pedido_minimo: (p.pedido_minimo ?? 1).toString(),
      ativo: p.ativo ?? true,
    });
    setErrors({});
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie os produtos do catálogo B2B</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Novo Produto
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        </div>
      ) : !products?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center shadow-sm">
          <ImageIcon className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-lg font-medium text-foreground">Nenhum produto cadastrado</h2>
          <p className="mt-2 text-sm text-muted-foreground">Crie seu primeiro produto para começar.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Imagem</th>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Categoria</th>
                <th className="px-4 py-3 text-right font-medium">Preço Venda</th>
                <th className="px-4 py-3 text-right font-medium">Custo Est.</th>
                <th className="px-4 py-3 text-right font-medium">Pedido Mín.</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3">
                    {p.imagem_url ? (
                      <img src={p.imagem_url} alt={p.nome} className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{p.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.categoria ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">{p.preco_venda != null ? formatBRL(p.preco_venda) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">{p.custo_estimado != null ? formatBRL(p.custo_estimado) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">{p.pedido_minimo}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={p.ativo ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => toggleActive.mutate({ id: p.id, ativo: !p.ativo })}
                    >
                      {p.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              {errors.nome && <p className="mt-1 text-xs text-destructive">{errors.nome}</p>}
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preço Venda (R$)</Label>
                <Input type="number" min="0" step="0.01" value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} />
                {errors.preco_venda && <p className="mt-1 text-xs text-destructive">{errors.preco_venda}</p>}
              </div>
              <div>
                <Label>Custo Estimado (R$)</Label>
                <Input type="number" min="0" step="0.01" value={form.custo_estimado} onChange={(e) => setForm({ ...form, custo_estimado: e.target.value })} />
                {errors.custo_estimado && <p className="mt-1 text-xs text-destructive">{errors.custo_estimado}</p>}
              </div>
            </div>
            <div>
              <Label>Pedido Mínimo</Label>
              <Input type="number" min="1" step="1" value={form.pedido_minimo} onChange={(e) => setForm({ ...form, pedido_minimo: e.target.value })} />
              {errors.pedido_minimo && <p className="mt-1 text-xs text-destructive">{errors.pedido_minimo}</p>}
            </div>
            <div>
              <Label>URL da Imagem</Label>
              <Input value={form.imagem_url} onChange={(e) => setForm({ ...form, imagem_url: e.target.value })} placeholder="https://..." />
              {form.imagem_url && (
                <img src={form.imagem_url} alt="Preview" className="mt-2 h-20 w-20 rounded-md object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
              )}
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              <Label>Produto ativo</Label>
            </div>
            <Button className="w-full" onClick={() => upsert.mutate()} disabled={upsert.isPending}>
              {upsert.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
