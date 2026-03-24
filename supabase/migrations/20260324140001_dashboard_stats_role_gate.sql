-- H9: Gate get_dashboard_stats() to admin role only.
--
-- Previously this SECURITY DEFINER function was callable by any
-- authenticated user, leaking system-wide lead and post counts.

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  RETURN (
    SELECT json_build_object(
      'lead_count',       (SELECT count(*) FROM leads),
      'new_leads',        (SELECT count(*) FROM leads WHERE status = 'new'),
      'converted_count',  (SELECT count(*) FROM leads WHERE status = 'converted'),
      'post_count',       (SELECT count(*) FROM posts)
    )
  );
END;
$$;
