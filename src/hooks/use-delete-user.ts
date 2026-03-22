import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/audit";

export function useDeleteUser() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; name: string; email?: string | null }) => {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", input.id);
      if (error) throw error;
      await logAudit({
        user_id: profile?.id,
        user_name: profile?.name,
        action_type: "delete",
        entity_type: "user",
        entity_id: input.id,
        details: { name: input.name, email: input.email },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_users"] });
      qc.invalidateQueries({ queryKey: ["b2b_companies_with_users"] });
    },
  });
}
