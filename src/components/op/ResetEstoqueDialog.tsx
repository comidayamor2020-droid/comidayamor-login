import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useResetAllStock } from "@/hooks/use-operational";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResetEstoqueDialog({ open, onOpenChange }: Props) {
  const resetAll = useResetAllStock();
  const [confirmText, setConfirmText] = useState("");

  const handleReset = async () => {
    try {
      const count = await resetAll.mutateAsync();
      toast.success(`Estoque zerado com sucesso! ${count} produto(s) ajustado(s).`);
      setConfirmText("");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao zerar estoque");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zerar Todo o Estoque
          </DialogTitle>
          <DialogDescription className="text-sm">
            Tem certeza que deseja zerar todo o estoque atual? Essa ação deve ser usada apenas para reinício controlado após testes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Todos os produtos com estoque &gt; 0 serão zerados e o ajuste será registrado no histórico com motivo
            <strong> "reset_inicial_implantacao"</strong>.
          </p>
          <div>
            <p className="mb-1 text-xs font-medium">
              Digite <strong>ZERAR</strong> para confirmar:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ZERAR"
            />
          </div>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={confirmText !== "ZERAR" || resetAll.isPending}
            className="w-full"
          >
            {resetAll.isPending ? "Zerando..." : "Confirmar Reset de Estoque"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
