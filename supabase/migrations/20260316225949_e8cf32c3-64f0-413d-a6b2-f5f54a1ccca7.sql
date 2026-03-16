
-- Re-grant full UPDATE to authenticated (needed for admin operations)
GRANT UPDATE ON public.users TO authenticated;

-- Drop the overly restrictive column grant approach
-- Instead, use a trigger to prevent non-admins from changing sensitive fields

CREATE OR REPLACE FUNCTION public.protect_user_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  -- Get the role of the caller
  SELECT role INTO caller_role FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;

  -- If caller is admin, allow all changes
  IF caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- For non-admin users, prevent changes to sensitive fields
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Permission denied: cannot change role';
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Permission denied: cannot change is_active';
  END IF;
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Permission denied: cannot change company_id';
  END IF;
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    RAISE EXCEPTION 'Permission denied: cannot change name';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Permission denied: cannot change email';
  END IF;
  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'Permission denied: cannot change auth_user_id';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_fields_trigger ON public.users;
CREATE TRIGGER protect_user_fields_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_fields();
