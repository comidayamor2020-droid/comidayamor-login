
-- Audit log for critical master actions
CREATE TABLE public.op_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id),
  user_name text,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb DEFAULT '{}',
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.op_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin/gestao can read and manage audit log
CREATE POLICY "audit_log_manage" ON public.op_audit_log
  FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'gestao'))
  WITH CHECK (current_user_role() IN ('admin', 'gestao'));

CREATE POLICY "audit_log_read" ON public.op_audit_log
  FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin', 'gestao', 'gerente_operacional'));

CREATE POLICY "sr_audit_log" ON public.op_audit_log
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Add DELETE policy for users table (admin only) - the protect_user_fields trigger already handles security
CREATE POLICY "admin_delete_users" ON public.users
  FOR DELETE TO authenticated
  USING (current_user_role() = 'admin' AND current_user_is_active() = true);
