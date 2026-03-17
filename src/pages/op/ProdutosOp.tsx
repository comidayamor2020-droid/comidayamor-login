import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOpProducts, useUpdateProductConfig } from "@/hooks/use-operational";
import { toast } from "sonner";

const DAYS = [
  { key: "estoque_ideal_seg", label: "Seg" },
  { key: "estoque_ideal_ter", label: "Ter" },
  { key: "estoque_ideal_qua", label: "Qua" },
  { key: "estoque_ideal_qui", label: "Qui" },
  { key: "estoque_ideal_sex", label: "Sex" },
  { key: "estoque_ideal_sab", label: "Sáb" },
  { key: "estoque_ideal_dom", label: "Dom" },
] as const;

export default function ProdutosOp() {
  const { data: products, isLoading } = useOpProducts();
  const updateConfig = useUpdateProductConfig();
  const [editing, setEditing] = useState<(typeof products extends (infer T)[] | undefined ? T : never) | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const openEdit = (p: NonNullable<typeof products>[number]) => {
    const c = (p.config ?? {}) as Record<string, unknown>;
    setForm({
      ativo: c.ativo ?? true,
      unidade: c.unidade ?? "un",
      validade_dias: c.validade_dias ?? 0,
      estoque_minimo: c.estoque_minimo ?? 0,
      estoque_ideal_seg: c.estoque_ideal_seg ?? 0,
      estoque_ideal_ter: c.estoque_ideal_ter ?? 0,
      estoque_ideal_qua: c.estoque_ideal_qua ?? 0,
      estoque_ideal_qui: c.estoque_ideal_qui ?? 0,
      estoque_ideal_sex: c.estoque_ideal_sex ?? 0,
      estoque_ideal_sab: c.estoque_ideal_sab ?? 0,
      estoque_ideal_dom: c.estoque_ideal_dom ?? 0,
    });
    setEditing(p);
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      await updateConfig.mutateAsync({ produto_id: editing.id, config: form });
      toast.success("Configuração salva!");
      setEditing(null);
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Produtos — Config. Operacional</h1>

        <div className="space-y-2">
          {(products ?? []).map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => openEdit(p)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-foreground">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    Estoque: {p.estoque_atual} | Mín: {p.config?.estoque_minimo ?? "—"}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openEdit(p); }}>
                  Editar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.ativo as boolean}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
              />
              <Label>Ativo</Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Unidade</Label>
                <Input
                  value={String(form.unidade ?? "")}
                  onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Validade (dias)</Label>
                <Input
                  type="number"
                  value={String(form.validade_dias ?? 0)}
                  onChange={(e) => setForm((f) => ({ ...f, validade_dias: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label className="text-xs">Estoque Mínimo</Label>
                <Input
                  type="number"
                  value={String(form.estoque_minimo ?? 0)}
                  onChange={(e) => setForm((f) => ({ ...f, estoque_minimo: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Estoque Ideal por Dia</Label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {DAYS.map((d) => (
                  <div key={d.key}>
                    <Label className="text-xs text-muted-foreground">{d.label}</Label>
                    <Input
                      type="number"
                      value={String(form[d.key] ?? 0)}
                      onChange={(e) => setForm((f) => ({ ...f, [d.key]: Number(e.target.value) }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleSave} disabled={updateConfig.isPending} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
