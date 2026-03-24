-- Add audit_logs table for tracking all invoice/payment mutations.
--
-- Used by:
--   - stripe-webhook edge function (actor_id = null for system events)
--   - yoco-webhook edge function
--   - Future: admin UI actions (mark paid, send email, status changes)

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type TEXT       NOT NULL,                         -- e.g. 'invoice', 'payment'
  resource_id  UUID        NOT NULL,                         -- FK to the relevant resource
  action       TEXT        NOT NULL,                         -- e.g. 'payment_succeeded', 'status_changed'
  actor_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for system/webhook actions
  old_values   JSONB,
  new_values   JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by resource
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx
  ON public.audit_logs (resource_type, resource_id);

-- Index for admin activity feed (by actor)
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx
  ON public.audit_logs (actor_id)
  WHERE actor_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all audit logs
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Nobody can update or delete audit logs (immutable append-only)
-- INSERT is handled by edge functions using the service role key (bypasses RLS)
