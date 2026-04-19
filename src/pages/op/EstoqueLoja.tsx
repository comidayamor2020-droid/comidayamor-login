import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  useOpProducts,
  useTodayDayCounts,
  useDayCountStatus,
  useSubmitCount,
  useRequestOccurrence,
  useConfirmDayCount,
  useReopenDayCount,
} from "@/hooks/use-operational";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AlertTriangle, Lock, Unlock, CheckCircle2 } from "lucide-react";

const REOPEN_ROLES = ["admin", "gestao", "gerente_operacional"];

export default function EstoqueLoja() {
  const { profile } = useAuth();
  const { data: products, isLoading: l1 } = useOpProducts();
  const { data: dayCounts, isLoading: l2 } = useTodayDayCounts();
  const { data: dayStatus, isLoading: l3 } = useDayCountStatus();
  const submitCount = useSubmitCount();
  const requestOccurrence = useRequestOccurrence();
  const confirmDay = useConfirmDayCount();
  const reopenDay = useReopenDayCount();

  const isConfirmed = !!dayStatus?.confirmed;
  const canReopen = REOPEN_ROLES.includes(profile?.role ?? "");

  const [countValues, setCountValues] = useState<Record<string, string>>({});
  const [occDialog, setOccDialog] = useState<{ produtoId: string; nome: string } | null>(null);
  const [occForm, setOccForm] = useState({ tipo: "perda", quantidade: "", motivo: "", observacao: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenMotivo, setReopenMotivo] = useState("");

  const dayCountsMap = useMemo(
    () => new Map((dayCounts ?? []).map((c) => [c.produto_id, c])),
    [dayCounts],
  );

  // Hydrate inputs with existing counted values so the user can edit them
  useEffect(() => {
    if (!dayCounts) return;
    setCountValues((prev) => {
      const next = { ...prev };
      for (const c of dayCounts) {
        if (next[c.produto_id] === undefined) {
          next[c.produto_id] = String(c.estoque_contado ?? "");
        }
      }
      return next;
    });
  }, [dayCounts]);

  if (l1 || l2 || l3) {
    return (
      <DashboardLayout>
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const totalProducts = products?.length ?? 0;
  const countedProducts = dayCounts?.length ?? 0;

  const handleCount = async (produtoId: string, esperado: number) => {
    if (isConfirmed) {
      toast.error("Contagem do dia confirmada. Reabra para editar.");
      return;
    }
    const raw = countValues[produtoId];
    const contado = Number(raw);
    if (raw === "" || raw === undefined || isNaN(contado)) {
      toast.error("Informe a quantidade contada");
      return;
    }
    try {
      await submitCount.mutateAsync({
        produto_id: produtoId,
        estoque_esperado: esperado,
        estoque_contado: contado,
      });
      toast.success("Contagem salva!");
    } catch (err: any) {
      console.error("Erro ao registrar contagem:", err);
      toast.error(err?.message ?? "Erro ao registrar contagem");
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

  const handleConfirmDay = async () => {
    try {
      await confirmDay.mutateAsync();
      toast.success("Contagem do dia confirmada!");
      setConfirmOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao confirmar contagem");
    }
  };

  const handleReopenDay = async () => {
    if (!reopenMotivo.trim()) {
      toast.error("Informe o motivo da reabertura");
      return;
    }
    try {
      await reopenDay.mutateAsync(reopenMotivo.trim());
      toast.success("Contagem reaberta para edição");
      setReopenOpen(false);
      setReopenMotivo("");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao reabrir contagem");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Estoque da Loja</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          {isConfirmed ? (
            <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
              <Lock className="h-3.5 w-3.5" />
              Contagem confirmada
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 border-amber-500 text-amber-700">
              <Unlock className="h-3.5 w-3.5" />
              Contagem em aberto
            </Badge>
          )}
        </div>

        {/* Confirm / Reopen action bar */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <p className="font-medium text-foreground">
                {countedProducts} de {totalProducts} produtos contados
              </p>
              <p className="text-xs text-muted-foreground">
                {isConfirmed
                  ? "Esta contagem foi fechada e está bloqueada para edição."
                  : "Você pode contar, corrigir e ajustar quantidades até confirmar o dia."}
              </p>
            </div>
            {isConfirmed ? (
              canReopen ? (
                <Button variant="outline" onClick={() => setReopenOpen(true)} className="gap-2">
                  <Unlock className="h-4 w-4" />
                  Reabrir contagem
                </Button>
              ) : null
            ) : (
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={countedProducts === 0 || confirmDay.isPending}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirmar contagem do dia
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {(products ?? []).map((p) => {
            const esperado = p.estoque_atual;
            const existingCount = dayCountsMap.get(p.id);
            const hasDivergence =
              existingCount && existingCount.diferenca !== 0 && existingCount.diferenca !== null;

            return (
              <Card key={p.id} className={hasDivergence ? "border-destructive/50" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        Esperado: <strong>{esperado}</strong>
                        {existingCount && (
                          <>
                            {" · "}Contado: <strong>{existingCount.estoque_contado}</strong>{" "}
                            <Badge
                              variant={existingCount.diferenca === 0 ? "secondary" : "destructive"}
                              className="ml-1 align-middle"
                            >
                              Dif: {existingCount.diferenca ?? 0}
                            </Badge>
                          </>
                        )}
                      </p>
                    </div>
                    {hasDivergence && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Input
                      type="number"
                      placeholder="Contado"
                      value={countValues[p.id] ?? ""}
                      onChange={(e) =>
                        setCountValues((v) => ({ ...v, [p.id]: e.target.value }))
                      }
                      className="w-24"
                      disabled={isConfirmed}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleCount(p.id, esperado)}
                      disabled={submitCount.isPending || isConfirmed}
                    >
                      {existingCount ? "Atualizar" : "Contar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => openOccurrence(p.id, p.nome, "perda")}
                      disabled={isConfirmed}
                    >
                      Perda
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => openOccurrence(p.id, p.nome, "degustacao")}
                      disabled={isConfirmed}
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

      {/* Occurrence dialog */}
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

      {/* Confirm-day dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar contagem do dia?</DialogTitle>
            <DialogDescription>
              Após confirmar, a contagem de estoque desta data será bloqueada para edição.
              Confirme apenas quando todos os produtos estiverem revisados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmDay} disabled={confirmDay.isPending}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen-day dialog */}
      <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir contagem do dia?</DialogTitle>
            <DialogDescription>
              A contagem voltará ao status "aberta" e poderá ser editada novamente.
              Esta ação será registrada na trilha de auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Motivo *</Label>
            <Textarea
              placeholder="Por que está reabrindo a contagem?"
              value={reopenMotivo}
              onChange={(e) => setReopenMotivo(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReopenDay} disabled={reopenDay.isPending}>
              Reabrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
