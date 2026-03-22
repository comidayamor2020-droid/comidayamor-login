import { supabase } from "@/integrations/supabase/client";

export interface AuditEntry {
  user_id?: string | null;
  user_name?: string | null;
  action_type: string; // "delete" | "update" | "reset" | "adjust"
  entity_type: string; // "scheduled_production" | "scheduled_item" | "user" | "stock"
  entity_id?: string;
  details?: Record<string, unknown>;
  motivo?: string;
}

export async function logAudit(entry: AuditEntry) {
  try {
    await supabase.from("op_audit_log" as any).insert({
      user_id: entry.user_id ?? null,
      user_name: entry.user_name ?? null,
      action_type: entry.action_type,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      details: entry.details ?? {},
      motivo: entry.motivo ?? null,
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}
