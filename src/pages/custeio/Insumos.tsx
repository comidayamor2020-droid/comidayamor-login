import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MaoObraAlert } from "@/components/custeio/MaoObraAlert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/format";

type Insumo = {
  id: string;
  nome: string;
  preco_embalagem: number;
  tamanho_embalagem: number;
  unidade_base: "g" | "ml" | "un";
  custo_unidade_base: number;
  observacao: string | null;
};

const EMPTY = {
  nome: "",
  preco_embalagem: "",
  tamanho_embalagem: "",
  unidade_base: "g" as "g" | "ml" | "un",
  observacao: "",
};

export default function Insumos() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving] = useState(false);

  const { data: insumos = [], isLoading } = useQuery({
    queryKey: ["custeio_insumos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custeio_insumos" as any)
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as Insumo[];
    },
  });

  const preco = Number(form.preco_embalagem || 0);
  const tam = Number(form.tamanho_embalagem || 0);
  const custoPreview = tam > 0 ? preco / tam : 0;

  function reset() {
    setEditing(null);
    setForm(EMPTY);
  }

  function startEdit(i: Insumo) {
    setEditing(i.id);
    setForm({
      nome: i.nome,
      preco_embalagem: String(i.preco_embalagem),
      tamanho_embalagem: String(i.tamanho_embalagem),
      unidade_base: i.unidade_base,
      observacao: i.observacao ?? "",
    });
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.preco_embalagem || !form.tamanho_embalagem) {
      toast({ title: "Preencha nome, preço e tamanho", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      preco_embalagem: Number(form.preco_embalagem),
      tamanho_embalagem: Number(form.tamanho_embalagem),
      unidade_base: form.unidade_base,
      observacao: form.observacao.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("custeio_insumos" as any).update(payload).eq("id", editing)
      : await supabase.from("custeio_insumos" as any).insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "Insumo atualizado" : "Insumo criado" });
      reset();
      qc.invalidateQueries({ queryKey: ["custeio_insumos"] });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este insumo?")) return;
    const { error } = await supabase.from("custeio_insumos" as any).delete().eq("id", id);
    if (error) toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Insumo excluído" });
      qc.invalidateQueries({ queryKey: ["custeio_insumos"] });
    }
  }

  return (
    <DashboardLayout>
      <h1 className="mb-1 font-display text-2xl font-semibold">Insumos</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Matéria-prima usada no custeio. O custo por unidade-base é calculado automaticamente (preço ÷ tamanho).
      </p>

      <MaoObraAlert />

      <Card className="mb-6 p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">
          {editing ? "Editar insumo" : "Novo insumo"}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Nome</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Farinha de trigo" />
          </div>
          <div className="space-y-1.5">
            <Label>Preço da embalagem (R$)</Label>
            <Input type="number" step="0.01" value={form.preco_embalagem}
              onChange={(e) => setForm({ ...form, preco_embalagem: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Tamanho da embalagem</Label>
            <Input type="number" step="0.0001" value={form.tamanho_embalagem}
              onChange={(e) => setForm({ ...form, tamanho_embalagem: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Unidade base</Label>
            <Select value={form.unidade_base} onValueChange={(v: "g" | "ml" | "un") => setForm({ ...form, unidade_base: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="g">g (grama)</SelectItem>
                <SelectItem value="ml">ml (mililitro)</SelectItem>
                <SelectItem value="un">un (unidade)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Custo por unidade-base (calculado)</Label>
            <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm">
              {custoPreview > 0
                ? `${formatBRL(custoPreview)} / ${form.unidade_base}`
                : "—"}
            </div>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Observação</Label>
            <Input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : editing ? "Atualizar" : "Adicionar"}
          </Button>
          {editing && (
            <Button variant="outline" onClick={reset} disabled={saving}>Cancelar</Button>
          )}
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Preço embal.</TableHead>
              <TableHead className="text-right">Tamanho</TableHead>
              <TableHead>Un.</TableHead>
              <TableHead className="text-right">Custo / un. base</TableHead>
              <TableHead>Obs.</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : insumos.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum insumo cadastrado.</TableCell></TableRow>
            ) : (
              insumos.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.nome}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(i.preco_embalagem))}</TableCell>
                  <TableCell className="text-right">{Number(i.tamanho_embalagem)}</TableCell>
                  <TableCell>{i.unidade_base}</TableCell>
                  <TableCell className="text-right">
                    {formatBRL(Number(i.custo_unidade_base))} / {i.unidade_base}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{i.observacao ?? ""}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(i)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(i.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </DashboardLayout>
  );
}
