-- M7: Per-invoice rate limiting for public endpoints
CREATE TABLE IF NOT EXISTS public.rate_limit_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_checks_key_window
  ON public.rate_limit_checks (key, window_start);

-- Auto-clean rows older than 24 hours (runs as a periodic maintenance hint;
-- actual cleanup can be done by pg_cron or a scheduled function)
-- RLS: this table is server-side only (service role key access)
ALTER TABLE public.rate_limit_checks ENABLE ROW LEVEL SECURITY;
-- No policies — only accessible via service role key in edge functions
