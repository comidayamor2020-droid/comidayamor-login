import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOpProducts, useTodayCounts, useSubmitCount, useRequestOccurrence } from "@/hooks/use-operational";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

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

  const openOccurrence = (produtoId: string, nome: string, tipo: "perda" | "degustacao") => {
    setOccDialog({ produtoId, nome });
    setOccForm({ tipo, quantidade: "", motivo: "", observacao: "" });
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
    } catch {
      toast.error("Erro ao enviar solicitação");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Estoque da Loja</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>

        <div className="space-y-3">
          {(products ?? []).map((p) => {
            const esperado = p.estoque_atual;
            const existingCount = countsMap.get(p.id);
            const hasDivergence = existingCount && existingCount.diferenca !== 0 && existingCount.diferenca !== null;

            return (
              <Card key={p.id} className={hasDivergence ? "border-destructive/50" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        Esperado: <strong>{esperado}</strong>
                      </p>
                    </div>
                    {hasDivergence && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  </div>

                  {existingCount ? (
                    <div className="mt-2">
                      <div className="flex items-center gap-3 text-sm">
                        <span>
                          Contado: <strong>{existingCount.estoque_contado}</strong>
                        </span>
                        <Badge variant={existingCount.diferenca === 0 ? "secondary" : "destructive"}>
                          Dif: {existingCount.diferenca ?? 0}
                        </Badge>
                      </div>
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

                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => openOccurrence(p.id, p.nome, "perda")}
                    >
                      Perda
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => openOccurrence(p.id, p.nome, "degustacao")}
                    >
                      Degustação
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={!!occDialog} onOpenChange={() => setOccDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {occForm.tipo === "perda" ? "Solicitar Perda" : "Solicitar Degustação"} — {occDialog?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={occForm.tipo} onValueChange={(v) => setOccForm((f) => ({ ...f, tipo: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="perda">Perda</SelectItem>
                  <SelectItem value="degustacao">Degustação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Quantidade</Label>
              <Input
                type="number"
                placeholder="Quantidade"
                value={occForm.quantidade}
                onChange={(e) => setOccForm((f) => ({ ...f, quantidade: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Motivo *</Label>
              <Input
                placeholder="Motivo"
                value={occForm.motivo}
                onChange={(e) => setOccForm((f) => ({ ...f, motivo: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Observação</Label>
              <Textarea
                placeholder="Observação (opcional)"
                value={occForm.observacao}
                onChange={(e) => setOccForm((f) => ({ ...f, observacao: e.target.value }))}
              />
            </div>
            <Button onClick={handleOccurrence} disabled={requestOccurrence.isPending} className="w-full">
              Enviar Solicitação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
