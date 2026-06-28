import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function MaoObraAlert() {
  const { data } = useQuery({
    queryKey: ["parametros_custeio", "mao_obra_check"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parametros_custeio" as any)
        .select("custo_hora_mao_obra")
        .limit(1)
        .maybeSingle();
      return data as unknown as { custo_hora_mao_obra: number | null } | null;
    },
  });

  const valor = Number(data?.custo_hora_mao_obra ?? 0);
  if (valor > 0) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900">
      <AlertTriangle className="h-5 w-5 flex-shrink-0" />
      <p>
        <strong>Atenção:</strong> o custo de mão de obra não está preenchido. Os custos calculados estão{" "}
        <strong>INCOMPLETOS</strong> (sem mão de obra) até você preencher este parâmetro em Custeio → Parâmetros.
      </p>
    </div>
  );
}
