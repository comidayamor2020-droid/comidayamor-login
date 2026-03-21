
CREATE OR REPLACE FUNCTION public.protect_user_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_role text;
BEGIN
  -- Allow service_role (used by edge functions) to make any changes
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

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
$function$;
