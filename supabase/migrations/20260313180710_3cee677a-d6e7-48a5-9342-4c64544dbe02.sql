CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'lead_count', (SELECT count(*) FROM leads),
    'new_leads', (SELECT count(*) FROM leads WHERE status = 'new'),
    'converted_count', (SELECT count(*) FROM leads WHERE status = 'converted'),
    'post_count', (SELECT count(*) FROM posts)
  )
$$;