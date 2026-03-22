import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOpProducts, useAdjustStock, MOTIVOS_AJUSTE } from "@/hooks/use-operational";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AjusteEstoqueDialog({ open, onOpenChange }: Props) {
  const { data: products } = useOpProducts();
  const adjustStock = useAdjustStock();

  const [produtoId, setProdutoId] = useState("");
  const [tipo, setTipo] = useState<"positivo" | "negativo" | "zerar">("positivo");
  const [quantidade, setQuantidade] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");

  const reset = () => {
    setProdutoId("");
    setTipo("positivo");
    setQuantidade("");
    setMotivo("");
    setObservacao("");
  };

  const selectedProduct = (products ?? []).find((p) => p.id === produtoId);

  const handleSubmit = async () => {
    if (!produtoId || !motivo) {
      toast.error("Selecione o produto e o motivo");
      return;
    }
    const qty = tipo === "zerar" ? 0 : Number(quantidade);
    if (tipo !== "zerar" && (!qty || qty <= 0)) {
      toast.error("Informe a quantidade");
      return;
    }
    try {
      await adjustStock.mutateAsync({
        produto_id: produtoId,
        tipo_ajuste: tipo,
        quantidade: qty,
        motivo,
        observacao: observacao || undefined,
      });
      toast.success("Ajuste registrado com sucesso!");
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao registrar ajuste");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajuste Manual de Estoque</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Produto *</Label>
            <Select value={produtoId} onValueChange={setProdutoId}>
              <SelectTrigger><SelectValue placeholder="Selecionar produto" /></SelectTrigger>
              <SelectContent>
                {(products ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome} (atual: {p.estoque_atual})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Tipo de Ajuste *</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="positivo">➕ Positivo (adicionar)</SelectItem>
                <SelectItem value="negativo">➖ Negativo (remover)</SelectItem>
                <SelectItem value="zerar">🔄 Zerar estoque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipo !== "zerar" && (
            <div>
              <Label className="text-xs">Quantidade *</Label>
              <Input
                type="number"
                placeholder="Quantidade"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
          )}

          {selectedProduct && (
            <p className="text-xs text-muted-foreground">
              Estoque atual: <strong>{selectedProduct.estoque_atual}</strong>
              {tipo === "zerar" && " → será zerado"}
              {tipo === "positivo" && quantidade && ` → ${selectedProduct.estoque_atual + Number(quantidade)}`}
              {tipo === "negativo" && quantidade && ` → ${Math.max(0, selectedProduct.estoque_atual - Number(quantidade))}`}
            </p>
          )}

          <div>
            <Label className="text-xs">Motivo *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger><SelectValue placeholder="Selecionar motivo" /></SelectTrigger>
              <SelectContent>
                {MOTIVOS_AJUSTE.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Observação</Label>
            <Textarea
              placeholder="Observação (opcional)"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>

          <Button onClick={handleSubmit} disabled={adjustStock.isPending} className="w-full">
            {adjustStock.isPending ? "Registrando..." : "Confirmar Ajuste"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
