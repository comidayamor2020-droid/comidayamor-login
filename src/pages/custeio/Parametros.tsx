import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MaoObraAlert } from "@/components/custeio/MaoObraAlert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Params = {
  id: string;
  custo_hora_mao_obra: number | null;
  custo_energia_kwh: number;
  aliquota_imposto: number;
  perda_refugo: number;
  margem_alvo: number;
  cdi_anual: number;
};

const FIELDS: {
  key: keyof Omit<Params, "id">;
  label: string;
  help: string;
  step: string;
}[] = [
  { key: "custo_hora_mao_obra", label: "Custo da hora de mão de obra (R$)", help: "salário + encargos ÷ horas trabalhadas no mês", step: "0.01" },
  { key: "custo_energia_kwh", label: "Custo da energia (R$/kWh)", help: "veja na conta de luz", step: "0.0001" },
  { key: "aliquota_imposto", label: "Alíquota de imposto (decimal)", help: "0.06 = 6%. Confirme com contador.", step: "0.0001" },
  { key: "perda_refugo", label: "Perda/refugo (decimal)", help: "0.05 = 5%. Quebra de produção.", step: "0.0001" },
  { key: "margem_alvo", label: "Margem-alvo (decimal)", help: "0.40 = 40%. Lucro desejado sobre o preço de venda.", step: "0.0001" },
];

export default function Parametros() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["parametros_custeio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parametros_custeio" as any)
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Params | null;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        custo_hora_mao_obra: data.custo_hora_mao_obra == null ? "" : String(data.custo_hora_mao_obra),
        custo_energia_kwh: String(data.custo_energia_kwh ?? ""),
        aliquota_imposto: String(data.aliquota_imposto ?? ""),
        perda_refugo: String(data.perda_refugo ?? ""),
        margem_alvo: String(data.margem_alvo ?? ""),
      });
    }
  }, [data]);

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    const payload = {
      custo_hora_mao_obra: form.custo_hora_mao_obra === "" ? null : Number(form.custo_hora_mao_obra),
      custo_energia_kwh: Number(form.custo_energia_kwh),
      aliquota_imposto: Number(form.aliquota_imposto),
      perda_refugo: Number(form.perda_refugo),
      margem_alvo: Number(form.margem_alvo),
    };
    const { error } = await supabase
      .from("parametros_custeio" as any)
      .update(payload)
      .eq("id", data.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Parâmetros salvos" });
      qc.invalidateQueries({ queryKey: ["parametros_custeio"] });
      qc.invalidateQueries({ queryKey: ["parametros_custeio", "mao_obra_check"] });
    }
  }

  return (
    <DashboardLayout>
      <h1 className="mb-1 font-display text-2xl font-semibold">Parâmetros de Custeio</h1>
      <p className="mb-6 text-sm text-muted-foreground">Configuração única usada nos cálculos de custo.</p>

      <MaoObraAlert />

      <Card className="p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="space-y-5">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  type="number"
                  step={f.step}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  placeholder={f.key === "custo_hora_mao_obra" ? "(em branco)" : ""}
                />
                <p className="text-xs text-muted-foreground">{f.help}</p>
              </div>
            ))}
            <div className="pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando…" : "Salvar parâmetros"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
