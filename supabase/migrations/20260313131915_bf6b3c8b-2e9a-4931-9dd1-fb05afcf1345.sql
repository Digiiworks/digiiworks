-- Drop the overly permissive INSERT policy
DROP POLICY "Anyone can submit leads" ON public.leads;

-- Re-create with restricted WITH CHECK: anonymous users can only insert
-- rows where status='new', priority=false, and assigned_to is null
CREATE POLICY "Anyone can submit leads"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'new'::lead_status
  AND (priority IS NULL OR priority = false)
  AND assigned_to IS NULL
);