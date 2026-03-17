import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOpProducts, useTodayCounts, useSubmitCount, useRequestOccurrence } from "@/hooks/use-operational";
import { toast } from "sonner";

export default function EstoqueLoja() {
  const { data: products, isLoading: l1 } = useOpProducts();
  const { data: counts, isLoading: l2 } = useTodayCounts();
  const submitCount = useSubmitCount();
  const requestOccurrence = useRequestOccurrence();

  const [countValues, setCountValues] = useState<Record<string, string>>({});
  const [occDialog, setOccDialog] = useState<{ produtoId: string; nome: string } | null>(null);
  const [occForm, setOccForm] = useState({ tipo: "perda", quantidade: "", motivo: "", observacao: "" });

  if (l1 || l2) {
    return (
      <DashboardLayout>
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const countsMap = new Map((counts ?? []).map((c) => [c.produto_id, c]));

  const handleCount = async (produtoId: string, esperado: number) => {
    const contado = Number(countValues[produtoId]);
    if (isNaN(contado)) {
      toast.error("Informe a quantidade contada");
      return;
    }
    try {
      await submitCount.mutateAsync({
        produto_id: produtoId,
        estoque_esperado: esperado,
        estoque_contado: contado,
      });
      toast.success("Contagem registrada!");
      setCountValues((v) => ({ ...v, [produtoId]: "" }));
    } catch {
      toast.error("Erro ao registrar contagem");
    }
  };

  const handleOccurrence = async () => {
    if (!occDialog) return;
    const q = Number(occForm.quantidade);
    if (!q || !occForm.motivo) {
      toast.error("Preencha quantidade e motivo");
      return;
    }
    try {
      await requestOccurrence.mutateAsync({
        produto_id: occDialog.produtoId,
        tipo_ocorrencia: occForm.tipo,
        quantidade_solicitada: q,
        motivo: occForm.motivo,
        observacao: occForm.observacao || undefined,
      });
      toast.success("Solicitação enviada para aprovação!");
      setOccDialog(null);
      setOccForm({ tipo: "perda", quantidade: "", motivo: "", observacao: "" });
    } catch {
      toast.error("Erro ao enviar solicitação");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Estoque da Loja</h1>

        <div className="space-y-3">
          {(products ?? []).map((p) => {
            const esperado = p.estoque_atual;
            const existingCount = countsMap.get(p.id);

            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">Esperado: {esperado}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOccDialog({ produtoId: p.id, nome: p.nome })}
                    >
                      Solicitar
                    </Button>
                  </div>

                  {existingCount ? (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span>
                        Contado: <strong>{existingCount.estoque_contado}</strong>
                      </span>
                      <span
                        className={`font-medium ${existingCount.diferenca === 0 ? "text-emerald-600" : "text-destructive"}`}
                      >
                        Dif: {existingCount.diferenca ?? 0}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <Input
                        type="number"
                        placeholder="Contado"
                        value={countValues[p.id] ?? ""}
                        onChange={(e) => setCountValues((v) => ({ ...v, [p.id]: e.target.value }))}
                        className="w-24"
                      />
                      <Button size="sm" onClick={() => handleCount(p.id, esperado)} disabled={submitCount.isPending}>
                        Contar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={!!occDialog} onOpenChange={() => setOccDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar — {occDialog?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={occForm.tipo} onValueChange={(v) => setOccForm((f) => ({ ...f, tipo: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="perda">Perda</SelectItem>
                <SelectItem value="degustacao">Degustação</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Quantidade"
              value={occForm.quantidade}
              onChange={(e) => setOccForm((f) => ({ ...f, quantidade: e.target.value }))}
            />
            <Input
              placeholder="Motivo"
              value={occForm.motivo}
              onChange={(e) => setOccForm((f) => ({ ...f, motivo: e.target.value }))}
            />
            <Textarea
              placeholder="Observação (opcional)"
              value={occForm.observacao}
              onChange={(e) => setOccForm((f) => ({ ...f, observacao: e.target.value }))}
            />
            <Button onClick={handleOccurrence} disabled={requestOccurrence.isPending} className="w-full">
              Enviar Solicitação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
