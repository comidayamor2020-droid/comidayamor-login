import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useOccurrences, useApproveOccurrence, useOpProducts } from "@/hooks/use-operational";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

export default function Aprovacoes() {
  const { data: pending, isLoading } = useOccurrences("pendente");
  const { data: products } = useOpProducts();
  const approve = useApproveOccurrence();
  const [adjustQty, setAdjustQty] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const productMap = new Map((products ?? []).map((p) => [p.id, p.nome]));

  const handleApprove = async (occ: NonNullable<typeof pending>[number]) => {
    const qty = Number(adjustQty[occ.id] || occ.quantidade_solicitada);
    try {
      await approve.mutateAsync({
        id: occ.id,
        produto_id: occ.produto_id,
        status: "aprovado",
        quantidade_aprovada: qty,
      });
      toast.success("Aprovado!");
    } catch {
      toast.error("Erro ao aprovar");
    }
  };

  const handleReject = async (occ: NonNullable<typeof pending>[number]) => {
    try {
      await approve.mutateAsync({
        id: occ.id,
        produto_id: occ.produto_id,
        status: "reprovado",
      });
      toast.success("Reprovado.");
    } catch {
      toast.error("Erro ao reprovar");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Aprovações</h1>

        {(pending ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
        ) : (
          <div className="space-y-3">
            {(pending ?? []).map((occ) => (
              <Card key={occ.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {productMap.get(occ.produto_id) ?? "Produto"}
                      </p>
                      <Badge variant="outline" className="mt-1">
                        {occ.tipo_ocorrencia === "perda" ? "Perda" : "Degustação"}
                      </Badge>
                    </div>
                    <p className="text-lg font-bold">{occ.quantidade_solicitada}</p>
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground">Motivo: {occ.motivo}</p>
                  {occ.observacao && (
                    <p className="text-xs text-muted-foreground">Obs: {occ.observacao}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(occ.data_solicitacao).toLocaleString("pt-BR")}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Qtd aprovada"
                      value={adjustQty[occ.id] ?? String(occ.quantidade_solicitada)}
                      onChange={(e) => setAdjustQty((v) => ({ ...v, [occ.id]: e.target.value }))}
                      className="w-24"
                    />
                    <Button size="sm" onClick={() => handleApprove(occ)} disabled={approve.isPending}>
                      <Check className="mr-1 h-3 w-3" /> Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(occ)}
                      disabled={approve.isPending}
                    >
                      <X className="mr-1 h-3 w-3" /> Reprovar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
