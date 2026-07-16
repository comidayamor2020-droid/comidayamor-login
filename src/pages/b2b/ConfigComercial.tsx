import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Config = {
  pedido_minimo: number;
  frete_gratis_acima: number;
  valor_frete: number;
  prazo_entrega_dias: number;
};

const DEFAULT: Config = {
  pedido_minimo: 250,
  frete_gratis_acima: 400,
  valor_frete: 25,
  prazo_entrega_dias: 3,
};

export default function ConfigComercial() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["config_comercial"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("config_comercial")
        .select("pedido_minimo, frete_gratis_acima, valor_frete, prazo_entrega_dias")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return (data as Config | null) ?? DEFAULT;
    },
  });

  const [form, setForm] = useState<Config>(DEFAULT);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  async function handleSave() {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("config_comercial")
      .upsert(
        {
          id: 1,
          pedido_minimo: Number(form.pedido_minimo),
          frete_gratis_acima: Number(form.frete_gratis_acima),
          valor_frete: Number(form.valor_frete),
          prazo_entrega_dias: Number(form.prazo_entrega_dias),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Configuração salva" });
    qc.invalidateQueries({ queryKey: ["config_comercial"] });
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 font-display text-2xl font-semibold">Configurações comerciais</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Regras aplicadas ao Simulador de Proposta B2B (pedido mínimo, frete e prazo de entrega).
      </p>

      <Card className="space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Pedido mínimo (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.pedido_minimo}
              onChange={(e) => setForm({ ...form, pedido_minimo: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Frete grátis acima de (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.frete_gratis_acima}
              onChange={(e) => setForm({ ...form, frete_gratis_acima: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Valor do frete (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.valor_frete}
              onChange={(e) => setForm({ ...form, valor_frete: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Prazo de entrega (dias úteis)</Label>
            <Input
              type="number"
              step="1"
              min="0"
              value={form.prazo_entrega_dias}
              onChange={(e) => setForm({ ...form, prazo_entrega_dias: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : "Salvar configurações"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
